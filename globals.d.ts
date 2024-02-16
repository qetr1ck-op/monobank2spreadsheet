declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_AUTH_TOKEN: string;
      NODE_ENV: 'development' | 'production';
      REDIS_HOST: string;
      REDIS_PORT: string;
    }
  }
}
