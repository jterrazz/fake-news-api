# Fake News API

A modern API service for a fake news game. Generating daily real and fake news. Built with Node.js, TypeScript, and powered by AI capabilities.

## 🚀 Features

- **AI-Powered Analysis**: Leverages latest AI models for content creation
- **Type Safety**: Built with TypeScript for robust type checking
- **Modern Architecture**: Clean architecture principles with dependency injection
- **Scalable**: Built on Hono.js for high performance
- **Monitoring**: Integrated with NewRelic for production monitoring

## 📋 Prerequisites

- Node.js 22.x
- npm

## 🛠 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jterrazz/fake-news-api.git
   cd fake-news-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   touch config/local.yml
   ```

   Then edit file with your configuration.

## 🚀 Usage

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## 🏗 Project Structure

```
config/            # Configuration files
src/
├── application/   # Applications ports and use cases
├── di/            # Dependency injection
├── domain/        # Business logic and interfaces
└── infrastructure/# External service implementations
```

## 🔧 Configuration

The application uses the `config` package for environment-specific configuration. Configuration files can be found in the `config/` directory.

## 🧪 Testing

This project uses Jest for testing. Tests are organized following the Given/When/Then pattern.

## 👤 Author

**Jean-Baptiste Terrazzoni**

- Email: contact@jterrazz.com
