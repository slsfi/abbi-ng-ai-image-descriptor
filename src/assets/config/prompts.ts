import { Prompts } from "../../app/types/prompt.types"

export const prompts: Prompts = [
  {
    languageCode: 'sv',
    languageDisplayName: 'Swedish (sv)',
    filenamePrompt: 'Bildens filnamn är {{FILENAME}}. Filnamnet kan innehålla användbara namn eller nyckelord, men observera att det saknar diakritiska tecken och kan innehålla irrelevanta sifferserier.',
    promptOptions: [
      {
        type: 'Alt text',
        prompt: 'Generera en kort (ca {{DESC_LENGTH}} tecken lång) beskrivning av vad bilden föreställer. Beskrivningen ska vara så koncis som möjlig, men samtidigt så detaljerad som bilden kräver. Beskrivningen kommer att användas som alternativ text (”alt-text”): text som är associerad med en bild och som tjänar samma syfte och förmedlar samma väsentliga information som bilden. Instruktioner: 1) Svara endast med själva beskrivningen av bilden, utan förklaringar eller konversation. 2) Börja inte med "Bilden föreställer" eller någon dylik fras, utan med vilken typ av bild det är, t.ex. ett foto, ett svartvitt foto, en målning, en ritning, en gravyr o.s.v. 3) De viktiga detaljerna borde framgå i början av beskrivningen. 4) Ignorera tavlors ramar.'
      },
      {
        type: 'ISAD(G) metadata',
        prompt: 'Generera en kort (ca {{DESC_LENGTH}} tecken lång) beskrivning av vad bilden föreställer. Beskrivningen ska vara så koncis som möjlig, men samtidigt så detaljerad som bilden kräver. Beskrivningen kommer att användas som alternativ text (”alt-text”): text som är associerad med en bild och som tjänar samma syfte och förmedlar samma väsentliga information som bilden. Instruktioner: 1) Svara endast med själva beskrivningen av bilden, utan förklaringar eller konversation. 2) Börja inte med "Bilden föreställer" eller någon dylik fras, utan med vilken typ av bild det är, t.ex. ett foto, ett svartvitt foto, en målning, en ritning, en gravyr o.s.v. 3) De viktiga detaljerna borde framgå i början av beskrivningen. 4) Ignorera tavlors ramar.'
      }
    ]
  },
  {
    languageCode: 'fi',
    languageDisplayName: 'Finnish (fi)',
    filenamePrompt: 'Kuvan tiedostonimi on {{FILENAME}}. Tiedostonimi saattaa sisältää arvokkaita avainsanoja, mutta huomaa, ettei se sisälla diakriittisiä merkkejä ja voi sisältää irrelevantteja numerosarjoja.',
    promptOptions: [
      {
        type: 'Alt text',
        prompt: 'Luo lyhyt (noin {{DESC_LENGTH}} merkkiä pitkä) kuvaus siitä, mitä kuva esittää. Kuvauksen tulee olla mahdollisimman ytimekäs, mutta silti kuvan vaatimalla tavalla yksityiskohtainen. Kuvausta käytetään vaihtoehtoisena tekstinä (tunnetaan myös nimellä alt-teksti): tekstinä, joka liittyy kuvaan ja joka palvelee samaa tarkoitusta ja välittää saman olennaisen tiedon kuin kuva. Ohjeet: 1) Vastaa vain varsinaisella kuvauksella, ilman perusteluja tai keskustelua. 2) Älä aloita ”Kuva esittää” tai vastaavalla ilmauksella, vaan millainen kuva on kyseessä, esimerkiksi valokuva, mustavalkoinen valokuva, maalaus, piirros, etsaus jne. 3) Tärkeät yksityiskohdat tulisi mainita heti ensimmäisissä sanoissa. 4) Jos kuva esittää kehystettyä taulua, jätä kehys huomiotta.'
      },
      {
        type: 'ISAD(G) metadata',
        prompt: 'Luo lyhyt (noin {{DESC_LENGTH}} merkkiä pitkä) kuvaus siitä, mitä kuva esittää. Kuvauksen tulee olla mahdollisimman ytimekäs, mutta silti kuvan vaatimalla tavalla yksityiskohtainen. Kuvausta käytetään vaihtoehtoisena tekstinä (tunnetaan myös nimellä alt-teksti): tekstinä, joka liittyy kuvaan ja joka palvelee samaa tarkoitusta ja välittää saman olennaisen tiedon kuin kuva. Ohjeet: 1) Vastaa vain varsinaisella kuvauksella, ilman perusteluja tai keskustelua. 2) Älä aloita ”Kuva esittää” tai vastaavalla ilmauksella, vaan millainen kuva on kyseessä, esimerkiksi valokuva, mustavalkoinen valokuva, maalaus, piirros, etsaus jne. 3) Tärkeät yksityiskohdat tulisi mainita heti ensimmäisissä sanoissa. 4) Jos kuva esittää kehystettyä taulua, jätä kehys huomiotta.'
      }
    ]
  },
  {
    languageCode: 'en',
    languageDisplayName: 'English (en)',
    filenamePrompt: 'The filename of the image is {{FILENAME}}. The filename can contain useful names or keywords, but notice that the letters lack diacritics and the filename can contain irrelevant series of numbers.',
    promptOptions: [
      {
        type: 'Alt text',
        prompt: 'Generate a short (about {{DESC_LENGTH}} characters long) description of what the image depicts. The description should be as concise as possible, yet as detailed as the image requires. The description will be used as alternative text (known as alt text): text associated with an image that serves the same purpose and conveys the same essential information as the image. Instructions: 1) Answer with just the actual description, without reasoning or conversation. 2) Don’t start with ”The image depicts” or a similar phrase, but with what kind of image it is, for example, a photo, a black-and-white photo, a painting, a drawing, an etching etc. 3) The important details should appear in the first few words. 4) If the picture in the image has a frame, ignore it.'
      },
      {
        type: 'ISAD(G) metadata',
        prompt: 'Generate a short (about {{DESC_LENGTH}} characters long) description of what the image depicts. The description should be as concise as possible, yet as detailed as the image requires. The description will be used as alternative text (known as alt text): text associated with an image that serves the same purpose and conveys the same essential information as the image. Instructions: 1) Answer with just the actual description, without reasoning or conversation. 2) Don’t start with ”The image depicts” or a similar phrase, but with what kind of image it is, for example, a photo, a black-and-white photo, a painting, a drawing, an etching etc. 3) The important details should appear in the first few words. 4) If the picture in the image has a frame, ignore it.'
      }
    ]
  }
]
