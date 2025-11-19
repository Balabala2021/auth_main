import * as React from "react";
import TextField from "@mui/material/TextField";
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers";
import moment, { Moment } from "moment";
import styled from "@emotion/styled";
import { Box } from "@mui/material";

interface MuiBookingCalendarProps {
  value: Date | Moment;
  onChange: (date: Date) => void;
  bookingsMarked?: Record<string, any>;
}

const CustomPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) => prop !== "highlighted" && prop !== "selectedDay"
})<{ highlighted?: boolean; selectedDay?: boolean }>(({ theme, highlighted, selectedDay }) => ({
  ...(highlighted && {
    backgroundColor: "#ffe082",
    color: "#000",
    borderRadius: "50%",
  }),
  ...(selectedDay && {
    backgroundColor: "#ffe082",
    color: "#fff",
    borderRadius: "50%",
  }),
}));

export const MuiBookingCalendar: React.FC<MuiBookingCalendarProps> = ({
  value,
  onChange,
  bookingsMarked = {},
}) => {
  // Helper to check if a date is marked
  const isMarked = (date: Moment) => {
    const formatted = date.format("YYYY-MM-DD");
    return !!bookingsMarked[formatted];
  };

  return (
   <Box sx={{
    ".MuiDateCalendar-root" : {
        border : "1px solid #e0e0e0",
        width : "100%"
    }
   }}>
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <StaticDatePicker
        displayStaticWrapperAs="desktop"
        orientation="landscape"
        openTo="day"
        value={moment(value)}
        onChange={(date) => {
          if (date) onChange(date.toDate());
        }}
        slots={{
          day: (props: PickersDayProps<Moment>) => {
            const date = props.day;
            const highlighted = isMarked(date);
            const selectedDay = date.isSame(moment(value), "day");
            return (
              <CustomPickersDay
                {...props}
                highlighted={highlighted}
                selectedDay={selectedDay}
              />
            );
          },
        }}
        renderInput={(params) => <TextField {...params} />}
        sx={{ width: "100%" }} // <-- Make picker full width
      />
    </LocalizationProvider>
  </Box>
  );
};