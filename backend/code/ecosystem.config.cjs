module.exports = {
  apps: [
    {
      name: 'travel-safe-api',
      cwd: __dirname,
      script: '.venv/bin/uvicorn',
      args: 'src.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
};
