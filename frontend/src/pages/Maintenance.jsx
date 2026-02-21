import './Page.css'

const Maintenance = () => {
  const maintenanceTasks = [
    { id: 1, task: 'Lubrication', frequency: 'Monthly', lastDone: '2026-01-14', nextDue: '2026-02-14', status: 'due' },
    { id: 2, task: 'Bearing Inspection', frequency: 'Quarterly', lastDone: '2025-11-14', nextDue: '2026-02-14', status: 'due' },
    { id: 3, task: 'Electrical Check', frequency: 'Monthly', lastDone: '2026-01-14', nextDue: '2026-02-14', status: 'due' },
    { id: 4, task: 'Calibration', frequency: 'Annually', lastDone: '2025-02-14', nextDue: '2026-02-14', status: 'due' },
  ]

  return (
    <div className="page-container maintenance-page">
      <h1 className="page-title">Maintenance</h1>
      <div className="page-content">
        <div className="card">
          <h2>Maintenance Schedule</h2>
          <div className="maintenance-table">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Frequency</th>
                  <th>Last Done</th>
                  <th>Next Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.task}</td>
                    <td>{task.frequency}</td>
                    <td>{task.lastDone}</td>
                    <td>{task.nextDue}</td>
                    <td>
                      <span className={`status-badge ${task.status}`}>
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Maintenance
