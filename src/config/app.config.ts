interface config {
  PORT: number;
  MONGO_URI: string;
}
export const config: config = {
  PORT: parseInt(process.env.PORT as string, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI as string,
};
