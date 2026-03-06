/**
 * Returns display string for project location (address, city name, or province).
 * Kept in separate file to avoid Turbopack parse issues with optional chaining in page.
 */
export function getProjectLocationStr(project: {
  address?: string | null;
  city?: { name?: string; province?: { name: string } } | null;
}): string {
  if (project.address && project.address.trim()) return project.address.trim();
  const city = project.city;
  if (city && city.name && city.name.trim()) return city.name.trim();
  if (city && city.province && city.province.name) return city.province.name;
  return '-';
}
