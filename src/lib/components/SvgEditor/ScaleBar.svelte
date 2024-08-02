<div id="scale-bar">
	<div id="scale-text"><slot /></div>
	<div id="scale-line"></div>
</div>

<style lang="postcss">
	#scale-bar {
		position: fixed;
		right: 20px;
		bottom: 20px;
		padding: 5px;
		font-family: Arial, sans-serif;
		font-size: 12px;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		color: rgb(255, 255, 255);
		pointer-events: none;
		& #scale-line {
			width: 200px;
			height: 8px;
			/* background-color: #ffffff; */
			border: 1px solid #ffffff;
			border-top: none;
		}
		& #scale-text {
			transform: translate(-4px, 0);
		}
	}
</style>
