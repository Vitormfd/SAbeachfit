const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  async rewrites() {
    // Com Supabase, /media/<arquivo> é servido direto do Storage (URL estável salva no banco, sem expor a origem).
    return supabaseUrl
      ? { beforeFiles: [{ source: "/media/:file", destination: `${supabaseUrl}/storage/v1/object/public/media/:file` }], afterFiles: [], fallback: [] }
      : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
