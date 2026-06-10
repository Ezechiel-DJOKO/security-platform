// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default withNextIntl(nextConfig);