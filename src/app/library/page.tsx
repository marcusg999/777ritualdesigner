const traditions = ['HipHop', 'OtherTradition'];

// ... other code

// Change filtering function
function filterTraditions(entityTradition) {
    return traditions.includes(entityTradition);
}

// Update to exact match filtering and add badge
if (entity.tradition.toLowerCase() === 'hiphop') {
    // Show HipHop badge
} else if (entity.tradition.toLowerCase() === 'pop culture') {
    // Hide Pop Culture badge
}