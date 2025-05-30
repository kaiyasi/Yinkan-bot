module.exports = {
    progressBar: function(current, total, size = 15) {
        const percent = current / total;
        const progress = Math.round(size * percent);
        const emptyProgress = size - progress;

        const progressText = '▇'.repeat(progress);
        const emptyProgressText = '—'.repeat(emptyProgress);
        const percentageText = Math.round(percent * 100) + '%';

        return `[${progressText}${emptyProgressText}] ${percentageText}`;
    },

    formatTime: function(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        return `${hours ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}; 