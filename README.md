# Saleor Jev Catalog Review

Experimental community alpha v0.1.2 · MIT.

## Français

Exemple hors ligne : `node examples/offline-catalog.mjs` rejoue une fiche de tasse synthétique à deux niveaux de probabilité. La faible probabilité reste en revue ; aucune clé ni requête réseau.

Un service vérifie les webhooks JWS de Saleor, analyse le texte d’un produit et écrit une décision dans ses métadonnées privées. Il ne publie ni ne bloque automatiquement un produit.

Installation :

```sh
npm ci
npm start
```

Variables serveur : `TYPESAFE_API_KEY, SALEOR_API_URL, SALEOR_APP_TOKEN`. Garder les secrets hors du dépôt et de la configuration visible par les utilisateurs.

Configurer un webhook asynchrone `PRODUCT_CREATED` ou `PRODUCT_UPDATED` associé à une app, sans `secretKey` hérité. Inclure `product { id name description privateMetadata { key value } }` dans l’abonnement. Autoriser `MANAGE_PRODUCTS`.

Un webhook déjà revu avec le même texte et la même politique est ignoré avant tout nouvel appel à Jev.

## English

Offline example: `node examples/offline-catalog.mjs` replays a synthetic mug listing at two probability levels. Low probability remains in review; no key or network request.

A service verifies Saleor JWS webhooks, evaluates product text, and writes a decision to private metadata. It does not automatically publish or block a product.

Setup:

```sh
npm ci
npm start
```

Server variables: `TYPESAFE_API_KEY, SALEOR_API_URL, SALEOR_APP_TOKEN`. Keep secrets outside the repository and user-visible configuration.

Configure an asynchronous `PRODUCT_CREATED` or `PRODUCT_UPDATED` webhook for an app, without a legacy `secretKey`. Include `product { id name description privateMetadata { key value } }` in the subscription. Grant `MANAGE_PRODUCTS`.

A webhook already reviewed with the same text and policy is skipped before another Jev call.

## Español

Ejemplo sin conexión: `node examples/offline-catalog.mjs` reproduce una ficha sintética de una taza con dos niveles de probabilidad. La probabilidad baja queda para revisión; no requiere clave ni red.

Un servicio verifica webhooks JWS de Saleor, evalúa el texto de un producto y escribe una decisión en metadatos privados. No publica ni bloquea productos automáticamente.

Instalación:

```sh
npm ci
npm start
```

Variables del servidor: `TYPESAFE_API_KEY, SALEOR_API_URL, SALEOR_APP_TOKEN`. Mantén los secretos fuera del repositorio y de la configuración visible para usuarios.

Configura un webhook asíncrono `PRODUCT_CREATED` o `PRODUCT_UPDATED` para una aplicación, sin `secretKey` heredado. Incluye `product { id name description privateMetadata { key value } }` en la suscripción. Concede `MANAGE_PRODUCTS`.

Un webhook ya revisado con el mismo texto y la misma política se omite antes de otra llamada a Jev.

## Verification / Vérification / Verificación

```sh
npm test
```

Tests use synthetic Jev responses and host event fixtures. Threshold `0.9` in `policy.json` is an example and must be calibrated on labeled data before automatic actions. No live host or Jev service has been exercised. / Les tests utilisent des réponses synthétiques et le seuil doit être calibré ; aucun hôte ni service Jev réel n’a été testé. / Las pruebas usan respuestas sintéticas y el umbral debe calibrarse; no se ha probado un host ni un servicio Jev real.

Host reference / Référence de l’hôte / Referencia del host: https://docs.saleor.io/developer/extending/webhooks/payload-signature

The receiver listens on `127.0.0.1:8080` by default; use a TLS reverse proxy for remote webhooks. `LISTEN_HOST` and `PORT` can override the bind address. / Le service écoute par défaut sur `127.0.0.1:8080` ; utiliser un proxy TLS pour les webhooks distants. / El servicio escucha por defecto en `127.0.0.1:8080`; usa un proxy TLS para webhooks remotos.
