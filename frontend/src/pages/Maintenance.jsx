import './Page.css'

const Maintenance = () => {
  const maintenanceTasks = [
    { id: 1, task: 'Lubrication', frequency: 'Monthly', lastDone: '2024-01-15', nextDue: '2024-02-15', status: 'due' },
    { id: 2, task: 'Bearing Inspection', frequency: 'Quarterly', lastDone: '2023-12-01', nextDue: '2024-03-01', status: 'scheduled' },
    { id: 3, task: 'Electrical Check', frequency: 'Monthly', lastDone: '2024-01-20', nextDue: '2024-02-20', status: 'scheduled' },
    { id: 4, task: 'Calibration', frequency: 'Annually', lastDone: '2023-06-01', nextDue: '2024-06-01', status: 'scheduled' },
  ]

  return (
    <div className="page-container">
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
