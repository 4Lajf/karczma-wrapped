<script>
    let { user, guild, year } = $props();
</script>

<div class="flex flex-col items-center justify-center h-full p-6 text-center bg-primary text-primary-foreground border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
    <div class="relative mb-8">
        {#if user.profile.avatarUrl}
            <img src={user.profile.avatarUrl} alt={user.profile.name} class="w-40 h-40 rounded-full border-4 border-black bg-white" />
        {:else}
            <div class="w-40 h-40 rounded-full border-4 border-black bg-white flex items-center justify-center text-4xl">
                {user.profile.name[0]}
            </div>
        {/if}
        <div class="absolute -bottom-2 -right-2 bg-accent text-accent-foreground px-3 py-1 border-2 border-black font-black text-sm transform rotate-6">
            #{user.metrics.rank}
        </div>
    </div>
    
    <h1 class="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter drop-shadow-sm">
        {user.profile.name}
    </h1>
    
    <p class="text-xl font-bold mb-12">
        {guild.name} Wrapped <span class="bg-black text-white px-2">{year}</span>
    </p>
    
    <div class="grid grid-cols-1 gap-4 w-full max-w-xs">
        <div class="p-4 bg-card text-card-foreground border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p class="text-4xl font-black">{user.metrics.totalMessages}</p>
            <p class="uppercase text-xs font-bold tracking-widest">Wiadomości</p>
        </div>
    </div>
</div>

