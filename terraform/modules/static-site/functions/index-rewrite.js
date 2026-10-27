// viewer-request: S3(REST + OAC)はサブディレクトリを index.html に自動解決しないため、URIを書き換える。
//   /            -> /index.html
//   /works/      -> /works/index.html
//   /works       -> /works/index.html
//   /css/a.css   -> そのまま（拡張子あり）
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    request.uri = uri + '/index.html';
  }

  return request;
}
