import { Prompts } from "../../app/types/prompt.types"

export const prompts: Prompts = [
  {
    languageCode: 'sv',
    languageDisplayName: 'Svenska',
    filenamePrompt: 'Bildens filnamn är {{FILENAME}}. Filnamnet kan innehålla värdefulla nyckelord, men observera att det saknar diakritiska tecken och kan innehålla irrelevanta sifferserier.',
    promptOptions: [
      {
        type: 'Alt text',
        prompt: 'Beskriv på svenska vad bilden föreställer med högst {{MAX_LENGTH}} tecken, gärna kortare om möjligt. Beskrivningen ska fungera som alt-text till bilden. Instruktioner: 1) Svara endast med själva beskrivningen av bilden, utan förklaringar eller konversation. 2) Börja inte med "Bilden föreställer" eller någon dylik fras, utan berätta vilken typ av bild det är, t.ex. ett foto (underförstått i färg), svartvitt foto, en målning, en ritning, en gravyr eller liknande. 3) Beskrivningen ska vara så kortfattad som möjlig, men samtidigt så detaljerad som bilden kräver. 4) Koncentrera dig på det centrala i bilden. 5) Undvik att tolka och spekulera.'
      },
      {
        type: 'ISAD(G) metadata',
        prompt: 'Beskriv på svenska vad bilden föreställer med högst {{MAX_LENGTH}} tecken, gärna kortare om möjligt. Beskrivningen ska fungera som metadata i ett arkivsystem så att bilden blir sökbar. Instruktioner: 1) Svara endast med själva beskrivningen av bilden, utan förklaringar eller konversation. 2) Börja inte med "Bilden föreställer" eller någon dylik fras, utan berätta vilken typ av bild det är, t.ex. ett foto (underförstått i färg), svartvitt foto, en målning, en ritning, en gravyr eller liknande. 3) Beskrivningen ska vara så kortfattad som möjlig, men samtidigt så detaljerad som bilden kräver. 4) Koncentrera dig på det centrala i bilden. 5) Undvik att tolka och spekulera.'
      }
    ]
  },
  {
    languageCode: 'fi',
    languageDisplayName: 'Suomi',
    filenamePrompt: 'Kuvan tiedostonimi on {{FILENAME}}. Tiedostonimi saattaa sisältää arvokkaita avainsanoja, mutta huomaa, ettei se sisälla diakriittisiä merkkejä ja voi sisältää irrelevantteja numerosarjoja.',
    promptOptions: [
      {
        type: 'Alt text',
        prompt: 'Kuvaa suomeksi mitä kuva esittää käyttäen korkeintaan {{MAX_LENGTH}} merkkiä, mielellään vähemmän jos mahdollista. Kuvauksen on tarkoitus toimia kuvan alt-tekstinä. Ohjeita: 1) Vastaa ainostaan itse kuvauksella, ilman selityksiä tai keskustelua. 2) Älä aloita kuvausta ilmaisulla "Kuva esittää" tai vastaavalla, vaan kerro minkätyyppinen kuva on kyseessä, esimerkiksi valokuva (oletuksena värivalokuva), mustavalkoinen valokuva, maalaus, piirustus, gravyyri tai jokin muu. 3) Kuvauksen on oltava niin lyhyt kuin mahdollista, mutta samalla niin yksityiskohtainen kuin kuva vaatii. 4) Keskity siihen, mikä on olennaista kuvassa. 5) Vältä tulkintoja ja spekuloimista.'
      },
      {
        type: 'ISAD(G) metadata',
        prompt: 'Kuvaa suomeksi mitä kuva esittää käyttäen korkeintaan {{MAX_LENGTH}} merkkiä, mielellään vähemmän jos mahdollista. Kuvauksen on tarkoitus toimia metadatana arkistointijärjestelmässä jotta kuvaa voi hakea. Ohjeita: 1) Vastaa ainostaan itse kuvauksella, ilman selityksiä tai keskustelua. 2) Älä aloita kuvausta ilmaisulla "Kuva esittää" tai vastaavalla, vaan kerro minkätyyppinen kuva on kyseessä, esimerkiksi valokuva (oletuksena värivalokuva), mustavalkoinen valokuva, maalaus, piirustus, gravyyri tai jokin muu. 3) Kuvauksen on oltava niin lyhyt kuin mahdollista, mutta samalla niin yksityiskohtainen kuin kuva vaatii. 4) Keskity siihen, mikä on olennaista kuvassa. 5) Vältä tulkintoja ja spekuloimista.'
      }
    ]
  },
]
