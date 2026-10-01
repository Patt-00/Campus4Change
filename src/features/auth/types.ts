export type AuthActions = {
  signIn: (id: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    studentId: string,
    password: string,
  ) => Promise<void>;
  biometrics: () => Promise<void>;
};
