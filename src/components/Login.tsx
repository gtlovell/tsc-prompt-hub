import React, { useState } from "react";
import { BrainCircuit } from "lucide-react";
import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
} from "../services/firebaseService";

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900 text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BrainCircuit className="w-12 h-12" strokeWidth={1} />
            <h1 className="text-4xl font-bold ml-4">Prompt Hub</h1>
          </div>
          <p className="text-zinc-400">
            {isSignUp
              ? "Create an account to get started."
              : "Sign in to access your prompts."}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center">
          <div className="border-t border-zinc-700 flex-grow"></div>
          <span className="px-4 text-zinc-500">OR</span>
          <div className="border-t border-zinc-700 flex-grow"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="mt-6 w-full flex items-center justify-center gap-x-3 bg-white text-black font-semibold p-3 rounded-lg transition hover:bg-zinc-200"
        >
          <img src="icons-google.svg" alt="Google" className="h-5 w-5" />
          <span>Sign in with Google</span>
        </button>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-indigo-400 hover:text-indigo-300 transition"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
