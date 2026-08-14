# Inventario a codice a barre

App web (nessuna installazione richiesta) per registrare l'inventario scansionando
i codici a barre uno dopo l'altro con la fotocamera del telefono.

## Come funziona

- Premi **Avvia scansione** e concedi il permesso alla fotocamera.
- Inquadra un codice a barre: viene aggiunto alla tabella con quantità 1; se lo
  scansioni di nuovo, la quantità aumenta.
- **Annulla ultima scansione** toglie l'ultimo codice letto (utile se lo stesso
  articolo viene "sparato" per errore).
- Ogni riga della tabella ha anche +1 / -1 / Elimina per correzioni manuali.
- **Esporta CSV** scarica l'inventario corrente.
- **Azzera inventario** cancella tutto (richiede conferma).

I dati restano solo sul telefono (salvati in `localStorage` del browser): se cambi
browser o cancelli i dati del sito, l'inventario si perde. Usa "Esporta CSV" per
avere una copia.

## Come aprirla sul telefono

I browser permettono l'accesso alla fotocamera solo su pagine servite in **HTTPS**
(o su `localhost`), quindi non basta aprire `index.html` direttamente dal telefono.
Il modo più semplice è pubblicare questa cartella con **GitHub Pages**:

1. Nelle impostazioni del repository: *Settings → Pages → Deploy from a branch*,
   scegli il branch con questi file e la cartella `/inventario` (o `/` se la
   pubblichi da sola).
2. Apri l'URL generato da GitHub Pages sul telefono.

In alternativa va bene qualsiasi hosting statico con HTTPS (Netlify, Vercel, ecc.).
