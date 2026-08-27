# DreamOff 🌙

**DreamOff** is a mobile-first, offline-capable Dream Interpretation application built with **React** and **Baroque AI** aesthetics. It uses a responsive design that adapts gracefully from a zero-scroll mobile grid to a comprehensive desktop dashboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/built%20with-React-61DAFB.svg)
![Tailwind](https://img.shields.io/badge/styling-TailwindCSS-38B2AC.svg)
![Vite](https://img.shields.io/badge/bundled%20with-Vite-646CFF.svg)

## ✨ Features

- **📱 Mobile-First Design**: Zero-scroll home screen with a tactile 2x2 grid layout.
- **🎨 Baroque Aesthetic**: Deep dark theme with `#d4af37` gold accents and serif typography.
- **🧠 Intelligent Interpretation**: 
  - **Mobile**: Concise summaries with modern archetypes.
  - **Tablet**: Structured analysis with symbol mapping.
  - **Desktop**: Deep matrix analysis with APA scientific correlation.
- **🌍 Multi-Language Support**: Auto-detects input language (e.g., Macedonian vs English) and responds in kind.
- **🔒 Privacy First**: All dream data is stored locally in your browser (`localStorage`). No external cloud database required.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dreamoff.git
   cd dreamoff
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run User Interface**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view the app.

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🚀 Deployment

The application is configured to automatically deploy to cPanel (`dreamoff.kiberius.com`) via GitHub Actions when you push to the `main` branch.

### Prerequisites for Auto-Deployment
You must set up the following **GitHub Secrets** in your repository settings:

1. **FTP_SERVER**: Your FTP host (e.g., `ftp.kiberius.com` or IP address).
2. **FTP_USERNAME**: Your FTP username.
3. **FTP_PASSWORD**: Your FTP password.

### Manual Deployment Fallback
If you prefer to deploy manually:
1. Run `npm run build` locally.
2. Open the `dist/` folder.
3. Upload the **contents** of the `dist/` folder directly to your cPanel directory (`dreamoff.kiberius.com/`).
4. Ensure `index.html` is in the root directory and NOT inside a `dist/` folder on the server.

## 📂 Project Structure

```
dreamoff/
├── src/
│   ├── components/    # Reusable UI (Card, Button)
│   ├── screens/       # Views (Home, Add, Archive, Detail)
│   ├── services/      # Mock AI Agents (Interpretation, Image)
│   ├── hooks/         # State Logic (useDreamStore)
│   └── App.jsx        # Main Router & Layout
├── public/            # Static assets
└── tailwind.config.js # Theme configuration
```

## 🛠 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Router**: Custom View Router (Lightweight)

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
