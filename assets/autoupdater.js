/*
// Example usage:
$(function () {
    // new AutoUpdater('inc/globalMessage.php', 60000);
    // You can create more updaters for other elements/endpoints as needed.
});
*/

class AutoUpdater {
	/**
	 * @param {string} endpoint - URL returning { domId1: data1, domId2: data2, ... }
	 * @param {number} intervalMs - Polling interval in ms
	 * @param {object} [options] - Optional config
	 * @param {object} [options.callbacks] - Map of DOM ID to callback(container, data)
	 */
	constructor(endpoint, intervalMs = 60000, options = {}) {
		this.endpoint = endpoint;
		this.intervalMs = intervalMs;
		this.lastData = {};
		this.callbacks = options.callbacks || {};
		this.timer = null;
		this.update = this.update.bind(this);
		this.start();
	}

	update() {
		if (document.visibilityState !== 'visible') return;

		fetch(this.endpoint)
			.then((response) => (response.status === 304 ? null : response.json()))
			.then((data) => {
				if (!data) return;

				for (const [id, newData] of Object.entries(data)) {
					const prevData = this.lastData[id];
					// Skip if data is unchanged
					if (JSON.stringify(newData) === JSON.stringify(prevData)) continue;
					
					this.lastData[id] = newData;
					
					if (this.callbacks[id]) {
						this.callbacks[id](newData);
					} else {
						const container = document.getElementById(id);
						if (!container) continue;
						container.innerHTML = typeof newData === 'string' ? newData : JSON.stringify(newData);

						// Reinitialize countdowns
						if (container.querySelector('.countdown') && typeof $.fn.liveCountdown === 'function') {
							$('.countdown').liveCountdown();
						}
					}
				}
			})
			.catch((err) =>
				console.error("Error fetching update for", this.endpoint, err)
			);
	}

	start() {
		this.update();
		this.timer = setInterval(this.update, this.intervalMs);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}

(function ($) {
	$.fn.liveCountdown = function (options) {
		const settings = $.extend(
			{
				format: "compact", // 'compact' or 'verbose'
				onExpire: null, // optional callback when countdown hits zero
			},
			options
		);

		return this.each(function () {
			const $el = $(this);
			const targetTs = parseInt($el.data("timestamp"), 10);
			if (!targetTs) return;

			function formatTime(diff) {
				if (diff <= 0) return "It's Time!";

				const hrs = Math.floor(diff / 3600);
				const mins = Math.floor((diff % 3600) / 60);
				const secs = diff % 60;

				if (settings.format === "verbose") {
					if (hrs > 0)
						return `${hrs} hour${
							hrs !== 1 ? "s" : ""
						} ${mins} minute${mins !== 1 ? "s" : ""}`;
					if (mins > 0)
						return `${mins} minute${
							mins !== 1 ? "s" : ""
						} ${secs} second${secs !== 1 ? "s" : ""}`;
					return `${secs} second${secs !== 1 ? "s" : ""}`;
				} else {
					if (hrs > 0) return `${hrs}hr ${mins} mins`;
					if (mins > 0) return `${mins} min${
							mins !== 1 ? "s" : ""
						} ${secs} sec${secs !== 1 ? "s" : ""}`;
					return `${secs} secs`;
				}
			}

			function update() {
				const now = Math.floor(Date.now() / 1000);
				const diff = targetTs - now;

				if (diff <= 0) {
					$el.text("It's Time!");
					clearInterval(timer);
					if (typeof settings.onExpire === "function") {
						settings.onExpire.call($el[0]);
					}
				} else {
					$el.text(formatTime(diff));
				}
			}

			update(); // immediate
			const timer = setInterval(update, 1000);
			$el.data("countdownTimer", timer); // store the timer ID in case you want to stop it
		});
	};
})(jQuery);

// $('.countdown').liveCountdown(); // Uses default compact formatting
// $(function () {
// 	// Or with options
// 	$(".countdown").liveCountdown({
// 		// format: "verbose",
// 		onExpire: function () {
// 			$(this).fadeOut(); // optional behavior
// 		},
// 	});
// });
