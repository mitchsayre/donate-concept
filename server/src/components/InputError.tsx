export interface LoginProps {
  errors?: string[];
}

export const InputError = ({ errors }: LoginProps) => {
  return (
    <>
      <div class="h-1">
        <div class="mt-1 ml-1 font-medium text-sm text-DANGER">
          {errors?.length ? errors[0] : ""}
        </div>
      </div>
    </>
  );
};
