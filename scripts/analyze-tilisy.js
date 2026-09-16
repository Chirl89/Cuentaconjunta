async function analyze() {
  const res = await fetch('https://tilisy.enablebanking.com/static/js/app.6bf4adb6.js');
  const t = await res.text();
  const re = /['"`](\/[a-zA-Z0-9_\-\/]+)['"`]/g;
  let m;
  const set = new Set();
  while ((m = re.exec(t)) !== null) {
    if (m[1].length > 3 && !m[1].match(/\.(png|svg|css|js)$/)) {
      set.add(m[1]);
    }
  }
  console.log('App endpoints:', [...set]);

  const resVendors = await fetch('https://tilisy.enablebanking.com/static/js/chunk-vendors.f0665b20.js');
  const tVendors = await resVendors.text();
  const re2 = /['"`](\/api\/[a-zA-Z0-9_\-\/]+)['"`]/g;
  while ((m = re2.exec(tVendors)) !== null) {
    set.add(m[1]);
  }
}
analyze().catch(console.error);
