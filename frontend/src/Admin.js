import { useState, useEffect } from "react";
import axios from "axios";

function Admin() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [problems, setProblems] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const addProblem = async () => {
    try {
      const res = await axios.post(
        "https://online-judge-tmxg.onrender.com/add-problem",
        {
          title,
          description,
          difficulty,
          expected_output: expectedOutput,
        },
      );

      alert(res.data.msg);

      setTitle("");
      setDescription("");
      setDifficulty("");
      setExpectedOutput("");
    } catch (err) {
      alert("Failed to add problem");
    }
  };

  const fetchProblems = async () => {
    try {
      const res = await axios.get(
        "https://online-judge-tmxg.onrender.com/problems",
      );
      setProblems(res.data);
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    fetchProblems();
  }, []);

  const deleteProblem = async (id) => {
    try {
      const res = await axios.delete(
        `https://online-judge-tmxg.onrender.com/delete-problem/${id}`,
      );

      alert(res.data.msg);

      fetchProblems();
    } catch (err) {
      alert("Delete failed");
    }
  };
  const updateProblem = async (id) => {
    try {
      const res = await axios.put(
        `https://online-judge-tmxg.onrender.com/edit-problem/${id}`,
        {
          title,
          description,
          difficulty,
          expected_output: expectedOutput,
        },
      );

      alert(res.data.msg);

      fetchProblems();
    } catch {
      alert("Update failed");
    }
  };
  return (
    <div style={{ padding: "20px" }}>
      <h2>Add Problem</h2>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <br />
      <br />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <br />
      <br />

      <input
        placeholder="Difficulty"
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      />
      <br />
      <br />

      <input
        placeholder="Expected Output"
        value={expectedOutput}
        onChange={(e) => setExpectedOutput(e.target.value)}
      />
      <br />
      <br />
      <input
        placeholder="Expected Output"
        value={expectedOutput}
        onChange={(e) => setExpectedOutput(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Test Input"
        value={testInput}
        onChange={(e) => setTestInput(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Expected Test Output"
        value={testOutput}
        onChange={(e) => setTestOutput(e.target.value)}
      />

      <br />
      <br />

      <button
        onClick={() => {
          if (editingId) {
            updateProblem(editingId);
          } else {
            addProblem();
          }
        }}
      >
        {editingId ? "Update Problem" : "Add Problem"}
      </button>
      <h2>Existing Problems</h2>

      {problems.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid gray",
            padding: "10px",
            margin: "10px 0",
          }}
        >
          <strong>{p.title}</strong>
          <br />
          {p.difficulty}

          <br />
          <br />
          <button
            onClick={() => {
              setEditingId(p.id);
              setTitle(p.title);
              setDescription(p.description);
              setDifficulty(p.difficulty);
              setExpectedOutput(p.expected_output);
            }}
          >
            Edit
          </button>
          <button onClick={() => deleteProblem(p.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default Admin;
