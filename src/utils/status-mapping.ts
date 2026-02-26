type Status = 'alert' | 'warning' | 'primary' | 'secondary';
type TextVariant = 'emphasis' | 'primary' | 'secondary' | 'tertiary' | 'alert' | 'warning';

/** ActionItems heat → Panel/Pill status */
export function heatToStatus(heat: 'hot' | 'warm' | 'cool'): Status {
  switch (heat) {
    case 'hot':  return 'alert';
    case 'warm': return 'warning';
    default:     return 'primary';
  }
}

/** ContextResume / UpNext urgency → Panel/Pill status */
export function urgencyToStatus(urgency: 'active' | 'waiting' | 'nudge'): Status {
  switch (urgency) {
    case 'active':  return 'alert';
    case 'waiting': return 'warning';
    default:        return 'primary';
  }
}

/** ActiveThreads EffortBucket → Pill status */
export function effortToStatus(effort: '15 min' | '1 hr' | 'half day' | 'full day'): Status {
  switch (effort) {
    case 'full day':  return 'warning';
    case 'half day':  return 'warning';
    case '1 hr':      return 'primary';
    default:          return 'secondary';
  }
}

/** FocusEngine "high"/"medium"/"low" → Pill status */
export function focusEffortToStatus(effort: 'high' | 'medium' | 'low'): Status {
  switch (effort) {
    case 'high':   return 'warning';
    case 'medium': return 'primary';
    default:       return 'secondary';
  }
}

/** ActiveThreads domain → Panel status (determines left-border colour) */
export function domainToStatus(domain: 'work' | 'personal'): Status {
  return domain === 'work' ? 'alert' : 'primary';
}

/** UpNext / ActiveThreads category → Pill status */
export function categoryToStatus(category: 'work' | 'personal'): Status {
  return category === 'work' ? 'alert' : 'primary';
}

/** UpNext urgency → Text variant for the indicator symbol */
export function urgencyToVariant(urgency: 'active' | 'waiting' | 'nudge'): TextVariant {
  switch (urgency) {
    case 'active':  return 'alert';
    case 'waiting': return 'warning';
    default:        return 'secondary';
  }
}

/** UpNext habit state → Text variant */
export function habitStateToVariant(state: 'ok' | 'late' | 'severe'): TextVariant {
  switch (state) {
    case 'severe': return 'alert';
    case 'late':   return 'warning';
    default:       return 'primary';
  }
}

/** UpNext priority urgency → Panel status */
export function priorityToStatus(urgency: 'high' | 'medium'): Status {
  return urgency === 'high' ? 'alert' : 'warning';
}
