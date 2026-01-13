<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SystemPulse - Device Diagnostics & Performance Analytics

Real-time device capability and performance analytics tool that analyzes your device's hardware capabilities, CPU performance, GPU, memory, and network status.

## Features

- **Real-time Diagnostics**: Live analysis of device capabilities and performance metrics
- **Performance Scoring**: Automatic performance level assessment (HIGH/MEDIUM/LOW)
- **Comprehensive Metrics**:
  - CPU cores detection (with hyperthreading handling)
  - RAM detection (with iOS fallback via user-agent parsing)
  - GPU detection and quality assessment
  - CPU benchmark with advanced variance detection
  - Display refresh rate estimation
  - Network connection analysis
  - Battery status monitoring
- **Auto-refresh**: Automatic diagnostics refresh every 10 seconds
- **AI Analysis**: Optional AI-powered system analysis using Gemini API
- **Privacy Compliant**: Respects browser privacy limitations (memory capping, etc.)

## Run Locally

**Prerequisites:** Node.js (v18 or higher)

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set the `GEMINI_API_KEY` in `.env.local` for AI analysis features:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Documentation

- **[METRICS_AND_THRESHOLDS.md](./METRICS_AND_THRESHOLDS.md)**: Detailed documentation of all metrics, thresholds, and scoring system
- **[METRICS_SPECIFICATION.md](./METRICS_SPECIFICATION.md)**: Technical specification of metrics implementation

## Performance Levels

- **HIGH**: Score < 1.5 AND all high-performance criteria met (≥8 cores, ≥8GB RAM, good GPU, ≥90Hz refresh)
- **MEDIUM**: Score < 2 (default)
- **LOW**: Score ≥ 2

## Browser Support

- Chrome/Edge (full support)
- Firefox (full support)
- Safari (with iOS RAM detection fallback)
- Mobile browsers (iOS and Android)

## License

Private project
