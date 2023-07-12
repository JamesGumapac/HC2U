/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(["N/file", "N/https", "N/search", "N/url"], /**
 * @param{file} file
 * @param https
 * @param search
 * @param url
 */ (file, https, search, url) => {
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
      return getFileLinkByContains(requestParams.filename)
    } catch (e) {
      log.error("post", e.message);
    }
  };

  /**
   * Search for the filename and link
   * @param {string} fileName
   * @returns {*[]} array object of all the results.
   */
  function getFileLinkByContains(fileName) {
    let fileLink = [];
    let output = url.resolveDomain({
      hostType: url.HostType.APPLICATION,
    });

    try {
      const fileSearchObj = search.create({
        type: "file",
        filters: [["name", "haskeywords", fileName]],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name",
          }),
          search.createColumn({ name: "url", label: "URL" }),
        ],
      });
      var searchResultCount = fileSearchObj.runPaged().count;
      log.debug("fileSearchObj result count", searchResultCount);
      fileSearchObj.run().each(function (result) {
        let url = result.getValue("url");
        let urlLink = `https://${output}${url}`;
        fileLink.push({
          filename: result.getValue("name"),
          link: urlLink,
        });
        return true;
      });
      return fileLink
    } catch (e) {
      log.error("getFileLinkByContains", e.message);
    }
  }

  return { post };
});
