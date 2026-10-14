# Frontline Unit Cards

Foundry VTT **13.351** için CoH 2 esintili birlik kartları. Token üzerine gelindiğinde portre, faction, birlik adı, lore, etkiler ve ters yönde çalışan SWADE yara barı görünür. Tasarım özgündür; Company of Heroes görsel varlıkları içermez.

![Örnek birlik kartı](https://raw.githubusercontent.com/UmutcanOrug/frontline-unit-cards/main/docs/preview.jpg)

![Renk ve arka plan ayarları](https://raw.githubusercontent.com/UmutcanOrug/frontline-unit-cards/main/docs/appearance-v020.jpg)

## Kurulum

Foundry → Add-on Modules → Install Module → Manifest URL:

```text
https://raw.githubusercontent.com/UmutcanOrug/frontline-unit-cards/main/module.json
```

World içinden **Frontline Unit Cards** modunu etkinleştir. Yerel ZIP kurulumu için arşivdeki `frontline-unit-cards` klasörünü Foundry'nin `Data/modules` klasörüne çıkart.

## Kullanım

- Token ayarlarını aç → alt bölümde **Birlik Kartı / Unit Card** düğmesine bas. Alternatif: token seçiliyken veya üzerindeyken **Shift+U**.
- Birlik adı, faction, lore, kısa uzmanlık notu, portre ve arka planı gir. İsim boşsa aktör adı, portre boşsa aktör görseli kullanılır.
- **Renkler ve arka plan / Colors and background** bölümünden Klasik metal, Zeytin yeşili, Çelik gri, Çöl kumu, Bordo veya Lacivert temasını seç. **Özel renkler** ile zemin ve çerçeve/vurgu rengini ayrı belirleyebilirsin.
- Arka plan görselinin **opaklığı (%0–100)**, **karartması (%0–100)**, **parlaklığı (%20–180)** ve **bulanıklığı (0–12 px)** ayarlanabilir. Görseli doldur, sığdır veya esnet; konumunu orta/üst/alt/sol/sağ seç. Bu ayarlar yalnızca görsel katmanına uygulanır; portre ve metin opaklığı korunur.
- Önizlemeyi açtıktan sonra görünüm ayarlarının sonucu anında güncellenir. **Görünümü sıfırla** renk ve görsel ayarlarını varsayılana döndürür. Değişiklikler **Kartı kaydet** ile o tokena kaydolur. Mevcut v0.1.0 kartları klasik temayla açılır.
- **Önizleme** kaydetmeden görünümü açar. Escape ile kapat. **Kartı kaydet** ayarları kaydeder; token ayarlarının ana formunu kaydetmen gerekmez.
- Her tokenın kartı ayrı açılıp kapatılabilir. Varsayılan olarak bütün tokenlarda kart açıktır. Görünürlük herkes / gözlemci / sahip / GM olarak seçilebilir. Gizli veya görüş dışında kalan tokenlar oyuncuya kart göstermez.
- Aktörün kendi etkileri ve aktöre aktarılan item etkileri otomatik alınır. Kalıcı olanlar **Pasif** (portre üzerinde), süreli olanlar **Aktif** (başlığın altında) grubuna gider. Kart düzenleyicisinde her etki için Otomatik, Pasif, Aktif veya Kartta gizle seçebilirsin. Bu seçim oyundaki etkinin davranışını değiştirmez. Devre dışı / baskılanmış etkiler görünmez. İkon üzerine gelince etki adı açılır.
- Can barı `actor.system.wounds.value` ve `actor.system.wounds.max` alanlarından okunur: `kalan = maksimum − mevcut yara`. Yara arttıkça bar azalır. SWADE Extra'larında maksimum 0 ise ilk yara kapasitesi 1 kabul edilir. Yara alanı bulunmayan sistemlerde bar gösterilmez. Bar hiçbir oyun verisini değiştirmez.
- Actor **Prototype Token** ayarlarında girilen kart bundan sonra oluşturulacak tokenlara aktarılır. Sahnedeki mevcut tokenlar etkilenmez.
- Module Settings bölümünden kişisel kart gösterimi, açılma gecikmesi ve boyut çarpanı değiştirilebilir. Token kart genişliği 340–720 pikseldir; uzun lore metni kartı uzatır ve gerektiğinde kaydırılır.

Kart açıkken aktör, wound ve etki değişiklikleri anında yansır. Harita kaydırma / yakınlaştırma sırasında konumu tokenı takip eder; ekranın kenarında sola geçer. Kartın üzerine giderek ikonları inceleyebilir ve lore metnini kaydırabilirsin.

## API

```js
// Select a token first; module API is available after Foundry ready.
game.modules.get("frontline-unit-cards").api.configure();
game.modules.get("frontline-unit-cards").api.preview(canvas.tokens.controlled[0]);
game.modules.get("frontline-unit-cards").api.hide();
```

Kart verileri tokenın `flags.frontline-unit-cards.card` alanında tutulur. Oyuncular yalnızca düzenleme yetkileri olan tokenları değiştirebilir. Varsayılan görünürlük tokenı görebilen herkese lore, yara ve etkileri gösterir; GM gerektiğinde bunu sınırlandırabilir.

## Geliştirme

Node.js 20+ ile `npm test`. Üretim modülünün dış bağımlılığı yoktur. `npm run package` dağıtım dosyalarından yerel ZIP oluşturur. GitHub sürümleri modül ZIP'ini ve `module.json` dosyasını içerir.

`node tools/preview-server.mjs` yerel örnek sahneyi `http://127.0.0.1:4174` adresinde açar. Bunun için Foundry'nin standart Windows kurulumundaki Handlebars ve ikon dosyaları kullanılır; gerçek world verisi okunmaz. Önizleme, Foundry olaylarını ve belge güncellemelerini taklit eder. Canlı Foundry/SWADE dünyasında ayrıca ilk kurulum denemesi yapılmalıdır.

Foundry V13 entegrasyonu: [ApplicationV2](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html), [PrototypeTokenConfig](https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.PrototypeTokenConfig.html).
