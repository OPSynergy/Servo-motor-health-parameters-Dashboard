# Servo Motor Health Parameters Dashboard

A modern React + Vite dashboard for monitoring servo motor health parameters with a collapsible transparent sidebar.

## Features

- **Collapsible Sidebar**: Transparent sidebar that collapses to show only icons
- **5 Main Sections**:
  - Home: Overview and quick stats
  - Motor Health: Detailed health metrics and parameters
  - Alarms: Real-time alarm monitoring
  - Maintenance: Maintenance schedule and tasks
  - Live Data Trends: Real-time parameter visualization
- **Settings**: Configuration options at the bottom of sidebar
- **White & Red Theme**: Clean, professional design

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx       # Collapsible sidebar component
│   └── Sidebar.css       # Sidebar styles
├── pages/
│   ├── Home.jsx          # Home page
│   ├── MotorHealth.jsx   # Motor health page
│   ├── Alarms.jsx        # Alarms page
│   ├── Maintenance.jsx   # Maintenance page
│   ├── LiveDataTrends.jsx # Live data trends page
│   ├── Settings.jsx      # Settings page
│   └── Page.css          # Shared page styles
├── App.jsx               # Main app component
├── App.css               # App styles
├── main.jsx              # Entry point
└── index.css             # Global styles
```

## Technologies Used

- React 18
- Vite
- React Icons
- CSS3

## Customization

You can customize the theme colors by modifying the CSS variables in the component files. The current theme uses:
- Primary Red: `#dc2626`
- Background: `#ffffff`
- Text: `#000000`
