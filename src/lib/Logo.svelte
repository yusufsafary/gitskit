<script lang="ts">
	let { size = 36 }: { size?: number } = $props();
</script>

<!--
	GitSkit logo — inline SVG, no raster artifacts at any size.
	viewBox: 100×100 square, corner-radius 14%.
	Mark: terminal chevron ">" + cursor "_"
-->
<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	style="display:block;flex-shrink:0;"
	role="img"
	aria-label="GitSkit"
>
	<!-- Background -->
	<rect width="100" height="100" rx="16" fill="#06060f"/>
	<!-- Border -->
	<rect x="1" y="1" width="98" height="98" rx="15" stroke="#6eff57" stroke-width="1.5" stroke-opacity="0.4"/>
	<!-- Top scan-line accent -->
	<rect x="12" y="10" width="76" height="1.5" rx="1" fill="#6eff57" fill-opacity="0.12"/>
	<!-- Chevron ">" -->
	<path
		d="M18 35 L40 50 L18 65"
		stroke="#6eff57"
		stroke-width="7"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<!-- Cursor "_" -->
	<rect x="47" y="57" width="35" height="6" rx="2.5" fill="#6eff57"/>
	<!-- Cursor left cap subtle glow mask -->
	<rect x="47" y="57" width="8" height="6" rx="2.5" fill="#6eff57" fill-opacity="0.4"/>
</svg>
