// Seed script for Indonesia Provinces and Cities
// Run with: bunx tsx prisma/seed-locations.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Indonesia Provinces with major cities
const indonesiaLocations = [
  {
    name: 'Aceh',
    code: '11',
    cities: ['Banda Aceh', 'Sabang', 'Langsa', 'Lhokseumawe', 'Subulussalam']
  },
  {
    name: 'Sumatera Utara',
    code: '12',
    cities: ['Medan', 'Pematangsiantar', 'Sibolga', 'Tanjungbalai', 'Binjai', 'Tebing Tinggi', 'Padang Sidempuan']
  },
  {
    name: 'Sumatera Barat',
    code: '13',
    cities: ['Padang', 'Solok', 'Sawahlunto', 'Padang Panjang', 'Bukittinggi', 'Payakumbuh', 'Pariaman']
  },
  {
    name: 'Riau',
    code: '14',
    cities: ['Pekanbaru', 'Dumai', 'Bengkalis', 'Kampar', 'Rokan Hilir']
  },
  {
    name: 'Jambi',
    code: '15',
    cities: ['Jambi', 'Muara Bungo', 'Batanghari', 'Tanjung Jabung Barat']
  },
  {
    name: 'Sumatera Selatan',
    code: '16',
    cities: ['Palembang', 'Prabumulih', 'Pagar Alam', 'Lubuklinggau', 'Banyuasin', 'Ogan Ilir']
  },
  {
    name: 'Bengkulu',
    code: '17',
    cities: ['Bengkulu', 'Rejang Lebong', 'Lebong', 'Kepahiang']
  },
  {
    name: 'Lampung',
    code: '18',
    cities: ['Bandar Lampung', 'Metro', 'Lampung Tengah', 'Lampung Selatan', 'Lampung Utara']
  },
  {
    name: 'Kepulauan Bangka Belitung',
    code: '19',
    cities: ['Pangkalpinang', 'Bangka', 'Belitung', 'Bangka Barat', 'Bangka Tengah']
  },
  {
    name: 'Kepulauan Riau',
    code: '21',
    cities: ['Batam', 'Tanjungpinang', 'Bintan', 'Karimun', 'Lingga', 'Natuna', 'Anambas']
  },
  {
    name: 'DKI Jakarta',
    code: '31',
    cities: ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Kepulauan Seribu']
  },
  {
    name: 'Jawa Barat',
    code: '32',
    cities: ['Bandung', 'Bogor', 'Cimahi', 'Cirebon', 'Depok', 'Sukabumi', 'Tasikmalaya', 'Banjar', 'Bekasi', 'Garut', 'Karawang', 'Sumedang', 'Purwakarta', 'Subang', 'Indramayu', 'Majalengka', 'Kuningan', 'Pangandaran']
  },
  {
    name: 'Jawa Tengah',
    code: '33',
    cities: ['Semarang', 'Solo', 'Pekalongan', 'Salatiga', 'Magelang', 'Surakarta', 'Tegal', 'Kudus', 'Kendal', 'Demak', 'Jepara', 'Pati', 'Rembang', 'Blora', 'Klaten', 'Sukoharjo', 'Karanganyar', 'Sragen', 'Boyolali', 'Wonogiri', 'Batang', 'Pemalang', 'Brebes', 'Banyumas', 'Purwokerto', 'Cilacap', 'Kebumen', 'Banjarnegara', 'Purbalingga', 'Wonosobo', 'Temanggung']
  },
  {
    name: 'DI Yogyakarta',
    code: '34',
    cities: ['Yogyakarta', 'Sleman', 'Bantul', 'Gunungkidul', 'Kulon Progo']
  },
  {
    name: 'Jawa Timur',
    code: '35',
    cities: ['Surabaya', 'Malang', 'Kediri', 'Blitar', 'Mojokerto', 'Madiun', 'Gresik', 'Sidoarjo', 'Pasuruan', 'Probolinggo', 'Situbondo', 'Bondowoso', 'Banyuwangi', 'Jember', 'Lumajang', 'Batu', 'Tulungagung', 'Trenggalek', 'Ponorogo', 'Pacitan', 'Ngawi', 'Magetan', 'Nganjuk', 'Jombang', 'Lamongan', 'Bojonegoro', 'Tuban', 'Babat']
  },
  {
    name: 'Banten',
    code: '36',
    cities: ['Tangerang', 'Tangerang Selatan', 'Serang', 'Cilegon', 'Pandeglang', 'Lebak', 'Rangkasbitung']
  },
  {
    name: 'Bali',
    code: '51',
    cities: ['Denpasar', 'Badung', 'Gianyar', 'Tabanan', 'Buleleng', 'Singaraja', 'Karangasem', 'Bangli', 'Klungkung', 'Jembrana', 'Negara', 'Mataram']
  },
  {
    name: 'Nusa Tenggara Barat',
    code: '52',
    cities: ['Mataram', 'Bima', 'Lombok Barat', 'Lombok Tengah', 'Lombok Timur', 'Lombok Utara', 'Sumbawa', 'Sumbawa Barat', 'Dompu']
  },
  {
    name: 'Nusa Tenggara Timur',
    code: '53',
    cities: ['Kupang', 'Ende', 'Maumere', 'Ruteng', 'Bajawa', 'Larantuka', 'Waingapu', 'Waikabubak', 'Atambua', 'Kefamenanu', 'Kalabahi', 'Labuan Bajo']
  },
  {
    name: 'Kalimantan Barat',
    code: '61',
    cities: ['Pontianak', 'Singkawang', 'Sambas', 'Bengkayang', 'Landak', 'Mempawah', 'Sanggau', 'Sekadau', 'Sintang', 'Kapuas Hulu', 'Melawi', 'Ketapang', 'Kayong Utara', 'Kubu Raya']
  },
  {
    name: 'Kalimantan Tengah',
    code: '62',
    cities: ['Palangka Raya', 'Kotawaringin Barat', 'Kotawaringin Timur', 'Kapuas', 'Barito Selatan', 'Barito Utara', 'Barito Timur', 'Murung Raya', 'Pulang Pisau', 'Gunung Mas', 'Katingan', 'Seruyan', 'Sukamara', 'Lamandau']
  },
  {
    name: 'Kalimantan Selatan',
    code: '63',
    cities: ['Banjarmasin', 'Banjarbaru', 'Banjar', 'Tapin', 'Hulu Sungai Selatan', 'Hulu Sungai Tengah', 'Hulu Sungai Utara', 'Balangan', 'Tabalong', 'Tanah Laut', 'Kotabaru']
  },
  {
    name: 'Kalimantan Timur',
    code: '64',
    cities: ['Samarinda', 'Balikpapan', 'Bontang', 'Kutai Kartanegara', 'Kutai Barat', 'Kutai Timur', 'Berau', 'Bulungan', 'Malinau', 'Nunukan', 'Tana Tidung']
  },
  {
    name: 'Kalimantan Utara',
    code: '65',
    cities: ['Tanjung Selor', 'Tarakan', 'Nunukan', 'Malinau', 'Bulungan', 'Tana Tidung']
  },
  {
    name: 'Sulawesi Utara',
    code: '71',
    cities: ['Manado', 'Bitung', 'Tomohon', 'Kotamobagu', 'Minahasa', 'Minahasa Utara', 'Minahasa Selatan', 'Minahasa Tenggara', 'Bolaang Mongondow', 'Bolaang Mongondow Utara', 'Bolaang Mongondow Selatan', 'Bolaang Mongondow Timur', 'Kepulauan Sangihe', 'Kepulauan Talaud', 'Kepulauan Siau Tagulandang Biaro']
  },
  {
    name: 'Sulawesi Tengah',
    code: '72',
    cities: ['Palu', 'Donggala', 'Parigi Moutong', 'Poso', 'Tojo Una-Una', 'Toli-Toli', 'Buol', 'Morowali', 'Morowali Utara', 'Banggai', 'Banggai Kepulauan', 'Banggai Laut']
  },
  {
    name: 'Sulawesi Selatan',
    code: '73',
    cities: ['Makassar', 'Parepare', 'Palopo', 'Gowa', 'Takalar', 'Jeneponto', 'Bantaeng', 'Bulukumba', 'Selayar', 'Bone', 'Soppeng', 'Wajo', 'Sidrap', 'Pinrang', 'Enrekang', 'Tana Toraja', 'Toraja Utara', 'Maros', 'Pangkajene Kepulauan', 'Sinjai', 'Luwu', 'Luwu Utara', 'Luwu Timur']
  },
  {
    name: 'Sulawesi Tenggara',
    code: '74',
    cities: ['Kendari', 'Baubau', 'Konawe', 'Konawe Selatan', 'Konawe Utara', 'Konawe Timur', 'Konawe Kepulauan', 'Muna', 'Muna Barat', 'Buton', 'Buton Utara', 'Buton Selatan', 'Buton Tengah', 'Wakatobi', 'Kolaka', 'Kolaka Utara', 'Kolaka Timur']
  },
  {
    name: 'Gorontalo',
    code: '75',
    cities: ['Gorontalo', 'Gorontalo Utara', 'Bone Bolango', 'Boalemo', 'Pohuwato']
  },
  {
    name: 'Sulawesi Barat',
    code: '76',
    cities: ['Mamuju', 'Mamuju Utara', 'Mamuju Selatan', 'Mamuju Tengah', 'Majene', 'Pasangkayu']
  },
  {
    name: 'Maluku',
    code: '81',
    cities: ['Ambon', 'Tual', 'Maluku Tengah', 'Maluku Tenggara', 'Maluku Tenggara Barat', 'Buru', 'Buru Selatan', 'Kepulauan Aru', 'Seram Bagian Barat', 'Seram Bagian Timur']
  },
  {
    name: 'Maluku Utara',
    code: '82',
    cities: ['Ternate', 'Tidore', 'Halmahera Barat', 'Halmahera Tengah', 'Halmahera Utara', 'Halmahera Timur', 'Halmahera Selatan', 'Kepulauan Sula', 'Pulau Morotai', 'Pulau-Pulau Taliabu']
  },
  {
    name: 'Papua',
    code: '91',
    cities: ['Jayapura', 'Merauke', 'Biak Numfor', 'Nabire', 'Paniai', 'Puncak Jaya', 'Mimika', 'Sarmi', 'Keerom', 'Pegunungan Bintang', 'Yahukimo', 'Tolikara', 'Waropen', 'Supiori', 'Mamberamo Raya', 'Mamberamo Tengah', 'Yalimo', 'Lanny Jaya', 'Nduga', 'Puncak', 'Dogiyai', 'Intan Jaya', 'Deiyai']
  },
  {
    name: 'Papua Barat',
    code: '92',
    cities: ['Manokwari', 'Sorong', 'Fakfak', 'Kaimana', 'Teluk Bintuni', 'Teluk Wondama', 'Raja Ampat', 'Sorong Selatan', 'Maybrat', 'Pegunungan Arfak']
  },
  {
    name: 'Papua Selatan',
    code: '93',
    cities: ['Merauke', 'Asmat', 'Mappi', 'Boven Digoel']
  },
  {
    name: 'Papua Tengah',
    code: '94',
    cities: ['Nabire', 'Paniai', 'Dogiyai', 'Intan Jaya', 'Deiyai', 'Mimika']
  },
  {
    name: 'Papua Pegunungan',
    code: '95',
    cities: ['Wamena', 'Jayawijaya', 'Puncak', 'Puncak Jaya', 'Nduga', 'Lanny Jaya', 'Tolikara', 'Yalimo', 'Pegunungan Bintang']
  },
  {
    name: 'Papua Barat Daya',
    code: '96',
    cities: ['Sorong', 'Raja Ampat', 'Sorong Selatan', 'Maybrat', 'Teluk Bintuni', 'Teluk Wondama']
  }
];

async function main() {
  console.log('Starting seed...');

  // Check if data already exists
  const existingProvinces = await prisma.province.count();
  if (existingProvinces > 0) {
    console.log('Data already exists. Skipping seed...');
    return;
  }

  console.log(`Seeding ${indonesiaLocations.length} provinces...`);

  for (const province of indonesiaLocations) {
    // Create province
    const createdProvince = await prisma.province.create({
      data: {
        name: province.name,
        code: province.code,
      }
    });

    console.log(`Created province: ${province.name}`);

    // Create cities for this province
    for (const cityName of province.cities) {
      await prisma.city.create({
        data: {
          name: cityName,
          provinceId: createdProvince.id,
        }
      });
    }

    console.log(`  - Created ${province.cities.length} cities for ${province.name}`);
  }

  const totalCities = await prisma.city.count();
  console.log(`\nSeed completed!`);
  console.log(`Total provinces: ${indonesiaLocations.length}`);
  console.log(`Total cities: ${totalCities}`);
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
