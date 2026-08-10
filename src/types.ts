export type Platforms = { windows: boolean; android: boolean; macos: boolean };

export type Project = {
  id: string;
  name: string;
  url: string;
  platforms: Platforms;
  status: string;
  created_at: string;
};
