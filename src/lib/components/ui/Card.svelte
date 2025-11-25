<!--
  @component
  Generic Card Component
  Provides a consistent wrapper for all dashboard cards.
-->
<script lang="ts">
	export let title: string = '';
</script>

<div class="card">
	<div class="card-header">
		<h3>{title}</h3>
		<div class="card-actions">
			<slot name="actions" />
		</div>
	</div>
	<div class="card-body">
		<slot />
	</div>
</div>
