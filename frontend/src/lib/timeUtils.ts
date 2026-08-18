/**
 * Generates appointment time slots based on:
 * - Start time: 10:00 AM
 * - Duration: 30 minutes
 * - Break: 5 minutes
 * - Total slots: 10 (ends at 3:45 PM)
 */
export const generateAppointmentSlots = () => {
    const slots = [];
    let currentHour = 10;
    let currentMinute = 0;

    for (let i = 0; i < 10; i++) {
        const startHour = currentHour;
        const startMinute = currentMinute;
        
        // Add 30 minutes for duration
        let endMinute = currentMinute + 30;
        let endHour = currentHour;
        if (endMinute >= 60) {
            endHour += 1;
            endMinute -= 60;
        }

        const formatTime = (h: number, m: number) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const startTimeStr = formatTime(startHour, startMinute);
        const endTimeStr = formatTime(endHour, endMinute);
        
        slots.push(`${startTimeStr} - ${endTimeStr}`);

        // Add 5 minutes break for the next start time
        currentMinute = endMinute + 5;
        currentHour = endHour;
        if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
        }
    }

    return slots;
};

/**
 * Returns a time-of-day greeting:
 * - 00:00 - 11:59: "Good Morning"
 * - 12:00 - 16:59: "Good Afternoon"
 * - 17:00 - 23:59: "Good Evening"
 */
export const getTimeGreeting = (date: Date = new Date()): string => {
    const hours = date.getHours();
    if (hours < 12) {
        return 'Good Morning';
    } else if (hours < 17) {
        return 'Good Afternoon';
    } else {
        return 'Good Evening';
    }
};

