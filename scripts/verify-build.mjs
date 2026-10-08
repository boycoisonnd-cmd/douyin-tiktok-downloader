import fs from 'fs';
import path from 'path';

async function verify() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TÍNH TOÀN VẸN CỦA BUILD VÀ EXTENSION ===\n');

  // 1. Kiểm tra các file quan trọng trong dist
  const distFiles = [
    'manifest.json',
    'src/sidepanel/index.html',
    'rules/dnr-rules.json',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    'src/content-scripts/main-interceptor.iife.js',
    'src/content-scripts/isolated-bridge.iife.js',
  ];

  console.log('1. Kiểm tra các file phân phối bắt buộc trong dist/:');
  for (const f of distFiles) {
    const fullPath = path.resolve('dist', f);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Thiếu file: dist/${f}`);
    }
    const stat = fs.statSync(fullPath);
    console.log(`  ✓ dist/${f} (${stat.size} bytes)`);
  }

  // 2. Kiểm tra tính hợp lệ của manifest.json
  console.log('\n2. Kiểm tra tính hợp lệ của dist/manifest.json:');
  const manifestRaw = fs.readFileSync(path.resolve('dist/manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  if (manifest.manifest_version !== 3) throw new Error('Manifest version phải là 3');
  if (!manifest.side_panel?.default_path) throw new Error('Thiếu side_panel.default_path');
  if (!manifest.declarative_net_request) throw new Error('Thiếu declarative_net_request');
  console.log('  ✓ Manifest V3 hợp lệ');
  console.log('  ✓ Side Panel default_path:', manifest.side_panel.default_path);
  console.log('  ✓ Host permissions:', manifest.host_permissions?.length, 'domains');
  console.log('  ✓ Content scripts:', manifest.content_scripts?.length, 'scripts');

  // 3. Kiểm tra dnr-rules.json
  console.log('\n3. Kiểm tra declarativeNetRequest rules:');
  const rules = JSON.parse(fs.readFileSync(path.resolve('dist/rules/dnr-rules.json'), 'utf8'));
  console.log(`  ✓ ${rules.length} quy tắc lọc request chống chặn 403 CDN (douyinvod, amemv, tiktokcdn)`);

  // 4. Kiểm tra HTTP server preview
  console.log('\n4. Kiểm tra HTTP server Side Panel:');
  const res = await fetch('http://localhost:4173/src/sidepanel/index.html');
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const html = await res.text();
  console.log(`  ✓ Side Panel HTML tải thành công (HTTP ${res.status}, ${html.length} bytes)`);

  // Trích xuất các assets trong HTML
  const matches = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  for (const asset of matches) {
    const assetUrl = 'http://localhost:4173' + (asset.startsWith('/') ? asset : '/' + asset);
    const assetRes = await fetch(assetUrl);
    if (!assetRes.ok) throw new Error(`Asset lỗi ${assetUrl}: ${assetRes.status}`);
    console.log(`  ✓ Asset: ${asset} -> HTTP ${assetRes.status} (${assetRes.headers.get('content-type')})`);
  }

  console.log('\n======================================================');
  console.log('🎉 TẤT CẢ KIỂM THỬ BUILD VÀ TÍNH NĂNG ĐỀU HOÀN TOÀN ĐẠT CHUẨN! 🎉');
  console.log('======================================================');
}

verify().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
