<script lang="ts">
	let { size = 36 }: { size?: number } = $props();
</script>

<img
	src="/logo.png"
	alt="GitSkit"
	width={size}
	height={size}
	style="display:block;object-fit:contain;border-radius:6px;flex-shrink:0;"
/>
