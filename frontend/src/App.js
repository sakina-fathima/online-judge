import Editor from "@monaco-editor/react";
import Admin from "./Admin";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const API = "https://online-judge-tmxg.onrender.com";
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [input, setInput] = useState("");

  const [output, setOutput] = useState("");
  const [submissions, setSubmissions] = useState([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [problemStatus, setProblemStatus] = useState({});

  const [stats, setStats] = useState({
    accepted: 0,
    wrong: 0,
    total: 0,
    rate: 0,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  // ================= LOGIN =================
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API}/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch {
      alert("Login Failed ❌");
    }
  };
  const handleRegister = async () => {
    try {
      const res = await axios.post(`${API}/register`, {
        email,
        password,
      });

      alert(res.data.msg);
    } catch (err) {
      alert(err.response?.data?.msg || "Registration Failed ❌");
    }
  };
  // ================= FETCH PROBLEMS =================
  const fetchProblems = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/problems`);

      console.log("PROBLEMS RECEIVED:", res.data);
      console.log("COUNT:", res.data.length);

      setProblems(res.data);
    } catch (err) {
      console.log("Error fetching problems", err);
    }
  }, []);

  // ================= FETCH SUBMISSIONS =================
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSubmissions(res.data);
      calculateProblemStatus(res.data);
      calculateStats(res.data);
    } catch (err) {
      console.log("Error fetching submissions", err);
    }
  }, [token]);

  // ================= LOAD DATA =================
  useEffect(() => {
    if (token) {
      fetchProblems();
      fetchSubmissions();
      fetchLeaderboard();
    }
  }, [token, fetchProblems, fetchSubmissions]);
  // ================= RUN =================
  const runCode = async () => {
    try {
      setOutput("Running... ⏳");

      console.log("TOKEN:", token);

      const res = await axios.post(
        `${API}/run`,
        { code, language, input },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("RUN RESPONSE:", res.data);

      setOutput(res.data.output);
    } catch (err) {
      console.log("RUN ERROR:", err);
      setOutput("Error running code ❌");
    }
  };
  const calculateProblemStatus = (subs) => {
    const status = {};

    subs.forEach((s) => {
      if (s.status === "Accepted") {
        status[s.problem_id] = "Solved";
      } else if (!status[s.problem_id]) {
        status[s.problem_id] = "Attempted";
      }
    });

    setProblemStatus(status);
  };
  // ================= SUBMIT =================
  const submitCode = async () => {
    if (!selectedProblem) {
      alert("Select a problem first");
      return;
    }

    try {
      setOutput("Submitting... ⏳");

      const res = await axios.post(
        `${API}/submit`,
        {
          problem_id: selectedProblem.id,
          code,
          language,
          input,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setOutput(
        `${res.data.status}${res.data.output ? "\n\n" + res.data.output : ""}`,
      );

      fetchSubmissions();
    } catch {
      setOutput("Submission failed ❌");
    }
  };
  const calculateStats = (subs) => {
    const accepted = subs.filter((s) => s.status === "Accepted").length;

    const wrong = subs.filter((s) => s.status === "Wrong Answer").length;

    const total = subs.length;

    const rate = total === 0 ? 0 : ((accepted / total) * 100).toFixed(1);

    setStats({
      accepted,
      wrong,
      total,
      rate,
    });
  };
  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/leaderboard`);
      setLeaderboard(res.data);
    } catch (err) {
      console.log(err);
    }
  };
  // ================= LOGOUT =================
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  // ================= LOGIN PAGE =================
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <img src="/logo.png" alt="Logo" className="login-logo" />

          <h1>Online Judge</h1>
          <p className="subtitle">Practice • Compete • Improve</p>

          <input
            type="email"
            placeholder="📧 Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="🔒 Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>

          <button className="register-btn" onClick={handleRegister}>
            Register
          </button>
        </div>
      </div>
    );
  }

  // ================= MAIN PAGE =================

  if (isAdmin) {
    return <Admin />;
  }

  return (
    <div
      className="app-container"
      style={{
        backgroundColor: darkMode ? "#121212" : "white",
        color: darkMode ? "white" : "black",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div className="header">
        <img src="/logo.png" alt="Online Judge Logo" className="logo" />
        <h1>Online Judge</h1>
      </div>
      <button onClick={() => setIsAdmin(true)}>Admin Panel</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
      </button>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          borderRadius: "10px",
          marginTop: "15px",
          marginBottom: "15px",
        }}
      >
        <h3>📊 Your Stats</h3>

        <p>✅ Accepted: {stats.accepted}</p>

        <p>❌ Wrong Answers: {stats.wrong}</p>

        <p>📄 Total Submissions: {stats.total}</p>

        <p>🏆 Acceptance Rate: {stats.rate}%</p>
      </div>
      <h3>🏅 Leaderboard</h3>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Accepted</th>
          </tr>
        </thead>

        <tbody>
          {leaderboard.map((u, index) => (
            <tr key={u.email}>
              <td>{index + 1}</td>
              <td>{u.email}</td>
              <td>{u.solved}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <h3>Problems</h3>
      {problems.map((p) => (
        <div
          key={p.id}
          style={{
            border:
              selectedProblem?.id === p.id
                ? "2px solid #1976d2"
                : "1px solid #ccc",
            backgroundColor: darkMode
              ? selectedProblem?.id === p.id
                ? "#2d3748"
                : "#1e1e1e"
              : selectedProblem?.id === p.id
                ? "#e3f2fd"
                : "white",
            color: darkMode ? "white" : "black",
            padding: "10px",
            margin: "5px",
            cursor: "pointer",
            borderRadius: "8px",
          }}
          onClick={() => setSelectedProblem(p)}
        >
          <strong>{p.title}</strong>

          <br />

          <span
            style={{
              color:
                p.difficulty === "easy"
                  ? "green"
                  : p.difficulty === "medium"
                    ? "orange"
                    : "red",
              fontWeight: "bold",
            }}
          >
            {p.difficulty.toUpperCase()}
          </span>

          <br />

          <span
            style={{
              fontWeight: "bold",
            }}
          >
            {problemStatus[p.id] === "Solved" && "🟢 Solved"}
            {problemStatus[p.id] === "Attempted" && "🔴 Attempted"}
            {!problemStatus[p.id] && "⚪ Not Attempted"}
          </span>
        </div>
      ))}
      {selectedProblem && (
        <>
          <h2>{selectedProblem.title}</h2>

          <p>{selectedProblem.description}</p>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="python">Python</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>

          <br />
          <br />

          <Editor
            height="400px"
            language={language === "cpp" ? "cpp" : language}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="vs-dark"
          />

          <br />
          <br />

          <textarea
            rows="4"
            cols="80"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Input"
          />

          <br />
          <br />

          <button
            style={{
              backgroundColor: "#2196F3",
              color: "white",
              padding: "10px 20px",
              marginRight: "10px",
              border: "none",
              borderRadius: "5px",
            }}
            onClick={runCode}
          >
            ▶ Run
          </button>

          <button
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
            }}
            onClick={submitCode}
          >
            ✅ Submit
          </button>

          <h3>Output</h3>

          <pre
            style={{
              backgroundColor: "#1e1e1e",
              color: "#00ff00",
              padding: "15px",
              borderRadius: "8px",
              minHeight: "100px",
              overflowX: "auto",
            }}
          >
            {output}
          </pre>
          <h3>Recent Submissions</h3>

          {submissions.length === 0 ? (
            <p>No submissions yet</p>
          ) : (
            submissions.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid gray",
                  padding: "10px",
                  marginTop: "5px",
                }}
              >
                <strong>Problem {s.problem_id}</strong>
                <br />
                Language: {s.language}
                <br />
                Status:
                <span
                  style={{
                    color: s.status === "Accepted" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {" "}
                  {s.status}
                </span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
export default App;
