import { useEffect, useState } from "react";

function Submissions() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/submissions", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setSubs(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>My Submissions</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Problem ID</th>
            <th>Language</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {subs.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.problem_id}</td>
              <td>{s.language}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Submissions;
