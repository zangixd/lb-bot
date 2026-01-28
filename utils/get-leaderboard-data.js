import 'dotenv/config';

export async function getLeaderboardData(map, page, player) {
	if (!map) throw new Error('No map name provided');
	
  let playerData = null;
	if (player) {
		const res = await fetch(`https://gapi.svc.krunker.io/api/map/${map}/leaderboard/player/${player}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-Developer-API-Key': process.env.KRUNKER_API_KEY
			},
		});

		if (res.ok) {
			const data = await res.json();
			playerData = Math.floor((data.position - 1) / 25) + 1 ?? null;
		} else {
			throw new Error('Player has not submitted a time on this map');
		}
	}


	const response = await fetch(`https://gapi.svc.krunker.io/api/map/${map}/leaderboard/?page=${playerData ?? page}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'X-Developer-API-Key': process.env.KRUNKER_API_KEY
		},
	});

	if (response.ok) {
		return await response.json();
	} else {
		throw new Error(`No leaderboard found for ${map}`);
	}
}