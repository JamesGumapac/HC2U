/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(["N/file", "N/https", "N/search", "N/url"]
/**
 * @param{file} file
 * @param https
 * @param search
 * @param url
 */, (file, https, search, url) => {
  /**
   * Defines the function that is executed when a GET request is sent to a RESTlet.
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
   *     content types)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const post = (requestParams) => {
    try {
      let f = file.load(getFileId(requestParams.filename));
      let output = url.resolveDomain({
        hostType: url.HostType.APPLICATION,
      });
      let urlLink = `https://${output}${f.url}`
      return JSON.stringify(urlLink)

    } catch (e) {
      log.error("post", e.message);
    }
  };

  /**
   * Return file Id based on filename
   * @param fileName
   * @returns {number}
   */
  function getFileId(fileName) {
    try {
      const fileSearch = search
        .create({
          type: "file",
          filters: [["name", "is", fileName]],
        })
        .run()
        .getRange({ start: 0, end: 1 });
      return fileSearch[0].id;
    } catch (e) {
      log.error("getFileId", e.message);
    }
  }

  return { post };
});
