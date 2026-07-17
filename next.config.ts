import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mantém o cliente libSQL fora do bundle do webpack — em produção ele fala com
  // o Turso por HTTP (sem binário nativo); empacotá-lo pode quebrar o build.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
