const { purgeOldStories } = require('../lib/firebase/firestore');

async function main() {
  try {
    console.log('Starting purge of old deleted stories...');
    await purgeOldStories();
    console.log('Purge completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during purge:', error);
    process.exit(1);
  }
}

main();