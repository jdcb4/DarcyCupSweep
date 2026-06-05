let draggedChip = null;

for (const chip of document.querySelectorAll('.nation-chip')) {
  wireChip(chip);
}

for (const zone of document.querySelectorAll(
  '[data-team-dropzone], [data-team-pool]'
)) {
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('drag-over');

    if (!draggedChip) {
      return;
    }

    if (
      zone.dataset.teamDropzone &&
      zone.querySelectorAll('.nation-chip').length >= 3
    ) {
      return;
    }

    zone.append(draggedChip);
    draggedChip = null;
    syncAdminForm();
  });
}

syncAdminForm();

function wireChip(chip) {
  chip.addEventListener('dragstart', () => {
    draggedChip = chip;
    chip.classList.add('dragging');
  });
  chip.addEventListener('dragend', () => {
    chip.classList.remove('dragging');
    draggedChip = null;
  });
}

function syncAdminForm() {
  for (const participant of document.querySelectorAll(
    '[data-participant-index]'
  )) {
    const index = participant.dataset.participantIndex;
    const input = participant.querySelector(`input[name="teams-${index}"]`);
    const teams = [...participant.querySelectorAll('[data-team]')].map(
      (chip) => chip.dataset.team ?? ''
    );

    input.value = teams.join('\n');
    const count = participant.querySelector('.admin-team-count');

    if (count) {
      count.textContent = `${teams.length}/3`;
    }
  }

  const availableCount = document.querySelector('#available-count');
  const pool = document.querySelector('[data-team-pool]');

  if (availableCount && pool) {
    availableCount.textContent = String(
      pool.querySelectorAll('.nation-chip').length
    );
  }
}
