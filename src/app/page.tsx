"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

interface GeneratedKey {
  key: string;
  userId: string;
  name?: string;
  createdAt: string;
}

interface StoredKey {
  id: string;
  keyPrefix: string;
  userId: string;
  name?: string;
  createdAt: string;
}

function AuthForm() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        <h2 className="text-2xl font-semibold text-white mb-6 text-center">
          Sign In
        </h2>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-6 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

function ApiKeyGenerator() {
  const { user, session, signOut } = useAuth();
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [existingKeys, setExistingKeys] = useState<StoredKey[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keysExpanded, setKeysExpanded] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // Fetch existing keys on mount
  useEffect(() => {
    if (session?.access_token) {
      fetchKeys();
    }
  }, [session?.access_token]);

  const fetchKeys = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/keys", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setExistingKeys(data.keys);
      }
    } catch {
      // Silently fail - keys will just not show
    }
  };

  const deleteKey = async (id: string) => {
    if (!session) return;
    setDeletingKeyId(id);
    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setExistingKeys((keys) => keys.filter((k) => k.id !== id));
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingKeyId(null);
    }
  };

  const generateKey = async () => {
    if (!user || !session) return;

    setLoading(true);
    setError("");

    try {
      const accessToken = session.access_token;

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: keyName.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to generate key");
        return;
      }

      setGeneratedKey(data.apiKey);
      setKeyName("");
      // Refresh existing keys list
      fetchKeys();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Hide the key 10 seconds after copying for security
      setTimeout(() => setGeneratedKey(null), 1000);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* User Info Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <div className="flex items-center gap-3">
          {user?.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-emerald-400 text-sm">
            <span className="text-white font-medium">
              {user?.user_metadata?.full_name || user?.email}
            </span>
          </span>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-emerald-400 hover:text-emerald-300 underline"
        >
          Sign Out
        </button>
      </div>

      {/* API Key Generator Card */}
      <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
        <h2 className="text-2xl font-semibold text-white mb-6">
          Generate API Key
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="keyName"
              className="block text-sm font-medium text-emerald-400 mb-2"
            >
              Key Name (optional)
            </label>
            <input
              id="keyName"
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g., My Phone"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={generateKey}
            disabled={loading}
            className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate API Key"}
          </button>
        </div>

        {/* Generated Key Display */}
        {generatedKey && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm font-medium mb-2">
              ✓ API Key Generated!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/30 px-3 py-2 rounded text-sm text-white font-mono break-all">
                {generatedKey.key}
              </code>
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-red-400 text-xs font-semibold mt-3">
              Save this key now - it won&apos;t be shown again!
            </p>
          </div>
        )}

        {/* Manage Keys - Collapsible */}
        {existingKeys.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <button
              onClick={() => setKeysExpanded(!keysExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-emerald-400">
                Manage Keys ({existingKeys.length}/3)
              </span>
              <svg
                className={`w-4 h-4 text-emerald-400 transition-transform ${keysExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {keysExpanded && (
              <div className="mt-3 space-y-2">
                {existingKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-white/60 font-mono">
                          {key.keyPrefix}...
                        </code>
                        {key.name && (
                          <span className="text-sm text-white truncate">
                            {key.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteKey(key.id)}
                      disabled={deletingKeyId === key.id}
                      className="ml-2 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition disabled:opacity-50"
                    >
                      {deletingKeyId === key.id ? "..." : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
        <h3 className="text-xl font-semibold text-white mb-4">How to Use</h3>

        <div className="space-y-4 text-emerald-400">
          <div>
            <h4 className="font-medium text-white">1. Add to Poke</h4>
            <p className="text-sm mt-1">
              <span className="text-emerald-400">Go to Poke Settings → </span><span className="text-emerald-200">Add MCP Server</span>
              <br />
              Server URL:
              <code className="bg-black/30 px-2 py-0.5 rounded text-xs text-emerald-200">
                https://vectrmcp.com/api/mcp
              </code>
              <br />
              X-API-Key: <span className="text-emerald-200">Your generated API key</span>
            </p>
          </div>

          <div>
            <h4 className="font-medium text-white">
              2. Send Location (React Native)
            </h4>
            <pre className="mt-2 p-3 bg-black/30 rounded text-xs overflow-x-auto text-emerald-200">
              {`fetch('https://vectrmcp.com/api/location', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    latitude: coords.latitude,
    longitude: coords.longitude
  })
})`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-white">3. Ask Poke</h4>
            <p className="text-sm mt-1">
              "Where am I right now?" — Poke will call{" "}
              <code className="bg-black/30 px-2 py-0.5 rounded text-xs text-emerald-200">
                get_my_location
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#070707] relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-emerald-500 mb-4">
            VectrMCP
          </h1>
          <p className="text-xl text-emerald-400 max-w-2xl mx-auto">
            Share your location with Poke. Sign in to get
            started.
          </p>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {/* Auth or Key Generator based on auth state */}
        {!loading && (user ? <ApiKeyGenerator /> : <AuthForm />)}
      </div>
    </div>
  );
}
