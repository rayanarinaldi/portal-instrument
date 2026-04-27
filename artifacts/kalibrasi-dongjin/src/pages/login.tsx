import { useState } from "react";
import { useAuth } from "../contexts/auth-context";
import logo from "../assets/logo-dongjin.png";

export default function LoginPage() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-100">

      {/* LEFT PANEL */}
      <div className="relative hidden md:flex flex-col justify-center items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 p-10 text-white">

        {/* animated glow */}
        <div className="absolute -right-24 -top-24 h-80 w-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 h-80 w-80 bg-cyan-300/10 rounded-full blur-3xl animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center text-center">

          <div className="mb-7 bg-white rounded-3xl p-3 shadow-2xl">
            <img src={logo} className="h-20 object-contain" />
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            PT. DONGJIN INDONESIA
          </h1>

          <p className="mt-4 text-sm text-blue-100 max-w-sm">
            Calibration Management System untuk monitoring, pencatatan,
            dan pelaporan instrument secara digital.
          </p>

          <div className="mt-8 flex gap-2 text-xs text-blue-100 flex-wrap justify-center">
            {["Instrument", "Calibration", "Monitoring", "Reporting"].map((i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                {i}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-6">

        {/* floating glow */}
        <div className="absolute right-10 top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-sm">

          {/* MOBILE LOGO */}
          <div className="flex justify-center mb-6 md:hidden">
            <div className="bg-white p-2 rounded-xl shadow">
              <img src={logo} className="h-12" />
            </div>
          </div>

          {/* CARD */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/40 transition-all duration-500 hover:scale-[1.02]">

            <div className="mb-6">
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                Internal Access
              </span>

              <h2 className="text-3xl font-black mt-2 text-slate-900">
                Login Sistem
              </h2>

              <p className="text-sm text-slate-500">
                Masukkan username & password
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-xs text-slate-500 font-semibold">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full h-12 px-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                  placeholder="Masukkan username"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-semibold">
                  Password
                </label>

                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 pr-14 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                    placeholder="Masukkan password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-xs"
                  >
                    👁
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-blue-800 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>

            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} PT. Dongjin Indonesia
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}