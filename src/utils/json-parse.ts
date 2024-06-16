export default async function parseJSON(payload: any) {
  try {
    const parsed = JSON.parse(payload);
    return parsed;
  } catch (err) {
    return {};
  }
}
