console.log("SERVER FILE:", __filename);
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "online_judge",
  password: "1234",
  port: 5432,
});

// ✅ DB CHECK
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ DB CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY");
    release();
  }
});

// ================= AUTH =================
const SECRET = "secretkey";

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token" });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// ================= CODE EXECUTION =================
function runCode(file, exe, language, input) {
  return new Promise((resolve) => {
    let compile;

    if (language === "c") {
      compile = spawn("gcc", [file, "-o", exe, "-mconsole"]);
    } else if (language === "cpp") {
      compile = spawn("g++", [file, "-o", exe, "-mconsole"]);
    } else if (language === "python") {
      const runPy = spawn("python", [file]);

      let output = "";
      let error = "";

      runPy.stdout.on("data", (data) => {
        output += data.toString();
      });

      runPy.stderr.on("data", (data) => {
        console.log("PYTHON ERROR:", data.toString());
        error += data.toString();
      });

      if (input) {
        runPy.stdin.write(input + "\n");
      }

      runPy.stdin.end();

      runPy.on("close", () => {
        resolve({ output, error });
      });

      return;
    } else {
      return resolve({
        error: "Unsupported language",
      });
    }

    // ===== COMPILE =====
    let compileError = "";

    compile.stderr.on("data", (data) => {
      compileError += data.toString();
    });

    compile.on("close", (code) => {
      if (code !== 0) {
        return resolve({
          error: compileError || "Compilation Error",
        });
      }

      // ===== RUN =====
      console.log("NEW CODE LOADED");
      console.log("Running EXE:", exe);

      const run = spawn(`./${exe}`);
      let output = "";
      let error = "";

      run.stdout.on("data", (data) => {
        output += data.toString();
      });

      run.stderr.on("data", (data) => {
        error += data.toString();
      });

      run.on("error", (err) => {
        console.log("EXE ERROR:", err);
        resolve({
          error: err.message,
        });
      });
      if (input) {
        run.stdin.write(input + "\n");
      }

      run.stdin.end();

      run.on("close", () => {
        resolve({ output, error });
      });
    });
  });
}
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("LOGIN REQUEST");
  console.log("Email:", email);

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND password=$2",
      [email, password],
    );

    console.log("FOUND USERS:", result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({
        msg: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: result.rows[0].id,
        email: result.rows[0].email,
      },
      SECRET,
    );

    res.json({ token });
  } catch (err) {
    console.log("LOGIN ERROR:", err);

    res.status(500).json({
      msg: err.message,
    });
  }
});
app.post("/register", async (req, res) => {
  console.log("REGISTER REQUEST");
  console.log(req.body);

  const { email, password } = req.body;

  try {
    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        msg: "User already exists",
      });
    }

    await pool.query("INSERT INTO users(email, password) VALUES($1,$2)", [
      email,
      password,
    ]);

    console.log("USER REGISTERED");

    res.json({
      msg: "Registration successful",
    });
  } catch (err) {
    console.log("REGISTER ERROR:", err);

    res.status(500).json({
      msg: err.message,
    });
  }
});
// ================= RUN =================
app.post("/run", auth, async (req, res) => {
  console.log("RUN API HIT");
  console.log(req.body);

  const { code, language, input } = req.body;

  const id = Date.now();

  const file =
    language === "cpp"
      ? `temp_${id}.cpp`
      : language === "c"
        ? `temp_${id}.c`
        : `temp_${id}.py`;

  const exe = `temp_${id}.exe`;

  fs.writeFileSync(file, code);

  const result = await runCode(file, exe, language, input);
  console.log("RESULT:", result);

  try {
    fs.unlinkSync(file);
  } catch {}

  try {
    if (language !== "python") {
      fs.unlinkSync(exe);
    }
  } catch {}

  res.json({
    output: result.error ? result.error : result.output,
  });
});

// ================= SUBMIT =================
app.post("/submit", auth, async (req, res) => {
  console.log("SUBMIT API HIT");
  console.log("BODY:", req.body);

  try {
    const { problem_id, code, language } = req.body;

    const testCaseResult = await pool.query(
      "SELECT input, output FROM test_cases WHERE problem_id = $1 ORDER BY id",
      [problem_id],
    );

    const cases = testCaseResult.rows;

    console.log("TEST CASES:", cases);

    if (cases.length === 0) {
      return res.status(400).json({
        msg: "No test cases found",
      });
    }

    let allPassed = true;
    let finalOutput = "";

    for (const t of cases) {
      const id = Date.now() + Math.random();

      const file =
        language === "cpp"
          ? `temp_${id}.cpp`
          : language === "c"
            ? `temp_${id}.c`
            : `temp_${id}.py`;

      const exe = `temp_${id}.exe`;

      fs.writeFileSync(file, code);

      const result = await runCode(file, exe, language, t.input);

      console.log("TEST RESULT:", result);

      if (result.error) {
        allPassed = false;
        finalOutput = result.error;
      } else {
        const userOutput = (result.output || "").trim().toLowerCase();
        const expectedOutput = (t.output || "").trim().toLowerCase();

        console.log("USER OUTPUT:", userOutput);
        console.log("EXPECTED OUTPUT:", expectedOutput);
        console.log("USER OUTPUT =", JSON.stringify(userOutput));
        console.log("EXPECTED OUTPUT =", JSON.stringify(expectedOutput));
        if (userOutput !== expectedOutput) {
          allPassed = false;
          finalOutput = result.output;
        }
      }

      try {
        fs.unlinkSync(file);
      } catch {}

      try {
        if (language !== "python") {
          fs.unlinkSync(exe);
        }
      } catch {}

      if (!allPassed) {
        break;
      }
    }

    console.log("ALL PASSED:", allPassed);

    try {
      await pool.query(
        `INSERT INTO submissions(user_id, problem_id, language, status)
   VALUES ($1,$2,$3,$4)`,
        [
          req.user.id,
          problem_id,
          language,
          allPassed ? "Accepted" : "Wrong Answer",
        ],
      );
    } catch (err) {
      console.log("SUBMISSION SAVE ERROR:", err);
    }

    res.json({
      status: allPassed ? "Accepted" : "Wrong Answer",
      output: finalOutput,
    });
  } catch (err) {
    console.log("SUBMIT ERROR:", err);

    res.status(500).json({
      msg: err.message,
    });
  }
});

// ================= PROBLEMS =================
app.get("/problems", async (req, res) => {
  console.log("PROBLEMS API HIT");

  try {
    const result = await pool.query("SELECT * FROM problems ORDER BY id ASC");

    console.log(result.rows);

    res.json(result.rows);
  } catch (err) {
    console.log("PROBLEMS ERROR:", err);

    res.status(500).json({
      msg: err.message,
    });
  }
});

// ================= HOME =================
app.get("/", (req, res) => {
  res.send("Online Judge Backend Running Successfully 🚀");
});

// ================= ADD PROBLEM =================
app.post("/add-problem", async (req, res) => {
  const {
    title,
    description,
    difficulty,
    expected_output,
    test_input,
    test_output,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO problems(title, description, difficulty, expected_output)
       VALUES($1,$2,$3,$4)
       RETURNING id`,
      [title, description, difficulty, expected_output],
    );

    const problemId = result.rows[0].id;

    await pool.query(
      `INSERT INTO test_cases(problem_id, input, output)
       VALUES($1,$2,$3)`,
      [problemId, test_input, test_output],
    );

    res.json({
      msg: "Problem and test case added successfully",
    });
  } catch (err) {
    res.status(500).json({
      msg: err.message,
    });
  }
});

// ================= SUBMISSIONS =================
app.get("/submissions", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM submissions
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      msg: err.message,
    });
  }
});

app.delete("/delete-problem/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM test_cases WHERE problem_id=$1", [id]);

    await pool.query("DELETE FROM problems WHERE id=$1", [id]);

    res.json({
      msg: "Problem deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      msg: err.message,
    });
  }
});
app.put("/edit-problem/:id", async (req, res) => {
  const id = req.params.id;

  const { title, description, difficulty, expected_output } = req.body;

  try {
    await pool.query(
      `UPDATE problems
       SET title=$1,
           description=$2,
           difficulty=$3,
           expected_output=$4
       WHERE id=$5`,
      [title, description, difficulty, expected_output, id],
    );

    res.json({
      msg: "Problem updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      msg: err.message,
    });
  }
});
// ================= LEADERBOARD =================
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.email,
             COUNT(*) AS solved
      FROM submissions
      JOIN users
        ON submissions.user_id = users.id
      WHERE submissions.status = 'Accepted'
      GROUP BY users.email
      ORDER BY solved DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      msg: err.message,
    });
  }
});
// ================= START =================
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
