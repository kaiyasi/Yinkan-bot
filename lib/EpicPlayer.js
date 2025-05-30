const { Message } = require("discord.js");
const { Player, Structure } = require("erela.js");
const Client = require("./DiscordMusicBot");

class EpicPlayer extends Player {
	constructor(...args) {
		super(...args);
		
		// 自定義屬性
				this.twentyFourSeven = false;
		this.previousTracks = [];
		this.autoplay = false;
	}

	// 設置 24/7 模式
	setTwentyFourSeven(twentyFourSeven) {
		this.twentyFourSeven = twentyFourSeven;
		return this;
	}

	// 設置自動播放
	setAutoplay(autoplay) {
		this.autoplay = autoplay;
		return this;
	}

	// 新增到播放歷史
	addPreviousTrack(track) {
		if (this.previousTracks.length >= 100) this.previousTracks.shift();
		this.previousTracks.push(track);
		return this;
	}

	// 獲取播放歷史
	getPreviousTracks() {
		return this.previousTracks;
	}

	// 清除播放歷史
	clearPreviousTracks() {
		this.previousTracks = [];
		return this;
			}
			
			/**
			 * Set's (maps) the client's resume message so it can be deleted afterwards
			 * @param {Client} client
			 * @param {Message} message
			 * @returns the Set Message
			 */
			setResumeMessage(client, message) {
				if (this.pausedMessage && !client.isMessageDeleted(this.pausedMessage)) {
					this.pausedMessage.delete();
					client.markMessageAsDeleted(this.pausedMessage);
				}
				return (this.resumeMessage = message);
			}
			
			/**
			 * Set's (maps) the client's paused message so it can be deleted afterwards
			 * @param {Client} client
			 * @param {Message} message
			 * @returns
			 */
			setPausedMessage(client, message) {
				if (this.resumeMessage && !client.isMessageDeleted(this.resumeMessage)) {
					this.resumeMessage.delete();
					client.markMessageAsDeleted(this.resumeMessage);
				}
				return (this.pausedMessage = message);
			}
			
			/**
			 * Set's (maps) the client's now playing message so it can be deleted afterwards
			 * @param {Client} client
			 * @param {Message} message
			 * @returns
			 */
			setNowplayingMessage(client, message) {
				if (this.nowPlayingMessage && !client.isMessageDeleted(this.nowPlayingMessage)) {
					this.nowPlayingMessage.delete();
					client.markMessageAsDeleted(this.nowPlayingMessage);
				}
				return (this.nowPlayingMessage = message);
			}
}

module.exports = { EpicPlayer };
