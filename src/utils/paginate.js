/**
 * Auto-pagination helper.
 *
 * @param {Function} fetchFn  - async (offset, limit) => Array<item>
 *                              The caller is responsible for extracting the
 *                              items array from whatever the API returns and
 *                              returning a plain Array.
 * @param {number}   pageSize - items per request (50 for 3LO, 100 for 2LO)
 * @returns {Promise<Array>}  - full concatenated result set
 */
export async function paginate(fetchFn, pageSize = 100) {
  const results = [];
  let offset = 0;

  while (true) {
    const page = await fetchFn(offset, pageSize);
    if (!Array.isArray(page) || page.length === 0) break;
    results.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return results;
}
