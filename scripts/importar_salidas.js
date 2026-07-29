const { db } = require('../src/config/firebase');

const registros = [
  ['29/07/2026 15:31:56','SALIDA (Tarde)','BNF','DONNYS GALLARDO','8,5982517','-70,3256167','https://drive.google.com/file/d/1YrJFN2cM2jZISkIB9HGvDZr56kmLh9pc/view?usp=drivesdk','ABDUVER RUBEN DIAZ ESPINOZA BAR04529'],
  ['29/07/2026 15:31:56','SALIDA (Tarde)','BAI','HILDERLING APITZ','8,3616314','-70,5905961','https://drive.google.com/file/d/1m7f-MAtKA0VDxh58J3FJW4H1XPSOGbnN/view?usp=drivesdk',''],
  ['29/07/2026 15:32:04','SALIDA (Tarde)','BPI','NELSON CORTEZ','8,3616301','-70,5905949','https://drive.google.com/file/d/1fhcVNTtZ6LAeCWgDnBm5IG9zFXEXsu1s/view?usp=drivesdk',''],
  ['29/07/2026 15:32:50','SALIDA (Tarde)','BPC','MARTIN OCANTO','8,751965','-70,39397','https://drive.google.com/file/d/1rd1HIawzn6QAaUgG8HATcaKMEJPjkRJy/view?usp=drivesdk','Salida de ruta'],
  ['29/07/2026 15:33:23','SALIDA (Tarde)','BAF','RONALD BAZAN','8,59828','-70,3255317','https://drive.google.com/file/d/1lZ0liPE8W-sBCz_-wk91S3XAhBfmrTFQ/view?usp=drivesdk','Salida'],
  ['29/07/2026 15:34:29','SALIDA (Tarde)','BNC','CARLOS CRAVO','8,7519181','-70,3940683','https://drive.google.com/file/d/1svsdaOxS0B8NF9cU1qjnK3HlUrK372in/view?usp=drivesdk','BAR04129 Gordo Angel'],
  ['29/07/2026 15:38:30','SALIDA (Tarde)','BAK','CARMEN MOLINA','7,814387','-71,1657557','https://drive.google.com/file/d/1lOcAmoaH8HqwvYqk64UzJvKw2USYEZq7/view?usp=drivesdk',''],
  ['29/07/2026 15:39:39','SALIDA (Tarde)','BNK','MARIA GUERRERO','7,8143966','-71,1657387','https://drive.google.com/file/d/1umFpP8XHa_Y42XVlzDcms-Mk8gJJynEQ/view?usp=drivesdk',''],
  ['29/07/2026 15:45:13','SALIDA (Tarde)','BAM','YESENIA ROJAS','8,4571384','-70,5524193','https://drive.google.com/file/d/14IqtaeW9FNTiJ1p6zcFw017snm_7aiZ3/view?usp=drivesdk',''],
  ['29/07/2026 16:03:33','SALIDA (Tarde)','BNQ','YETSI ESCALONA','8,755365','-69,9296217','https://drive.google.com/file/d/1Zz_mpamBSgyMuR2trDwo1wfspiH9ukIV/view?usp=drivesdk',''],
];

function parseFecha(v) {
  const p = v.split(' ');
  const dp = p[0].split('/');
  const tp = (p[1] || '00:00:00').split(':');
  return `${dp[2]}-${dp[1].padStart(2,'0')}-${dp[0].padStart(2,'0')} ${(tp[0]||'0').padStart(2,'0')}:${(tp[1]||'00').padStart(2,'0')}:${(tp[2]||'00').padStart(2,'0')}`;
}

function coord(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(',','.'));
  return isNaN(n) ? null : n;
}

async function main() {
  let inserted = 0;
  for (const r of registros) {
    const fecha = parseFecha(r[0]);
    const rec = {
      codigo: r[2].trim(),
      nombre: r[3].trim(),
      tipo: r[1].trim(),
      comentario: (r[7] || '').trim(),
      latitud: coord(r[4]),
      longitud: coord(r[5]),
      foto: r[6].trim() || null,
      fecha,
    };
    await db.collection('registros').add(rec);
    inserted++;
  }
  console.log(`✓ ${inserted} registros insertados.`);
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
