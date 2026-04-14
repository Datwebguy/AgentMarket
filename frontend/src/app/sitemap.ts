import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentmarket.xyz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL,             lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${APP_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${APP_URL}/pricing`,     lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/docs`,        lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/deploy`,      lastModified: new Date(), changeFrequency: 'monthly',priority: 0.7 },
    { url: `${APP_URL}/signin`,      lastModified: new Date(), changeFrequency: 'monthly',priority: 0.5 },
  ];

  // Dynamic agent pages — fetch from API
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const res  = await fetch(`${API}/agents?limit=100&status=ACTIVE`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const agentPages: MetadataRoute.Sitemap = data.agents.map((agent: any) => ({
        url:              `${APP_URL}/marketplace/${agent.slug}`,
        lastModified:     new Date(agent.updatedAt),
        changeFrequency:  'hourly',
        priority:         0.85,
      }));
      return [...staticPages, ...agentPages];
    }
  } catch {
    // Return static pages if API is unavailable
  }

  return staticPages;
}
