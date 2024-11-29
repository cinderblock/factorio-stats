declare module 'fork-me-on-github' {
  export type Opts = {
    repo: string;
    colorOctocat?: string;
    colorBackground?: string;
    isDocumentation?: boolean;
    side?: 'left' | 'right';
    text?: string;
  };
  const ForkMe: (opts: Opts) => JSX.Element;
  export default ForkMe;
}
