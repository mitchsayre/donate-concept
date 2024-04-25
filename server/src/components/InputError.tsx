export interface LoginProps {
  errors?: string[];
}

export const InputError = ({ errors }: LoginProps) => {
  return (
    <>
      <div class="h-5">
        <div data-input-error-message class="pt-1 pl-1 font-medium text-sm text-DANGER">
          {errors?.length ? errors[0] : ""}
        </div>
      </div>
    </>
  );
};
